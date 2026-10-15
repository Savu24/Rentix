import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, ok, validationError } from "@/lib/api/response";
import { membershipRole, requireApiOwner } from "@/lib/auth/session";
import {
  organizationRentFee,
  PAID_PLANS,
  priceByLookupKey,
  priceLookupKey,
  rentFeeLookupKey,
  stripeClient,
} from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const checkoutSchema = z.object({ plan: z.enum(PAID_PLANS) });

/**
 * POST /api/billing/checkout — sesja płatności za plan.
 *
 * Zwraca `client_secret`, a nie przekierowanie: formularz Stripe montuje się
 * w ustawieniach konta (`ui_mode: "form"`). Plan zmienia dopiero webhook po
 * opłaceniu, ten endpoint niczego w koncie nie zapisuje.
 *
 * Kupuje właściciel albo administrator organizacji — płatność wiąże całe
 * konto, nie osobę, która akurat kliknęła.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const t = auth.d.panel.settings.plan.billing;

  const role = await membershipRole(auth.session.user.id, auth.organizationId);
  if (role !== "OWNER" && role !== "ADMIN") return apiError("FORBIDDEN", t.managerOnly);

  const stripe = stripeClient();
  if (!stripe) return apiError("INTERNAL_ERROR", t.unavailable);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: auth.organizationId },
    select: { billingExempt: true, externalCustomerId: true, externalSubscriptionId: true, status: true },
  });

  if (subscription?.billingExempt) return apiError("CONFLICT", t.exempt);

  // Druga subskrypcja obok trwającej obciążałaby kartę dwa razy. Zmiana
  // planu opłaconego konta idzie przez portal płatności.
  if (subscription?.externalSubscriptionId && subscription.status !== "CANCELLED") {
    return apiError("CONFLICT", t.alreadySubscribed);
  }

  const planKey = priceLookupKey(parsed.data.plan, auth.locale);
  const feeKey = rentFeeLookupKey(auth.locale);
  if (!planKey || !feeKey) return apiError("INTERNAL_ERROR", t.unavailable);

  // Bez ceny opłaty od czynszu nie sprzedajemy wcale: plan bez niej byłby
  // tańszy, niż mówi cennik, a dopisanie jej później zaskoczyłoby klienta.
  const [price, feePrice, rentFee] = await Promise.all([
    priceByLookupKey(stripe, planKey),
    priceByLookupKey(stripe, feeKey),
    organizationRentFee(auth.organizationId),
  ]);
  if (!price || !feePrice) return apiError("INTERNAL_ERROR", t.unavailable);

  // Konto bez aktywnych umów nie ma od czego płacić procentu — pozycję
  // dołoży nocny cron, gdy pojawi się pierwsza umowa.
  const lineItems = [
    { price: price.id, quantity: 1 },
    ...(rentFee > 0 ? [{ price: feePrice.id, quantity: rentFee }] : []),
  ];

  const origin = env.APP_URL ?? request.nextUrl.origin;
  const customer = subscription?.externalCustomerId;

  const session = await stripe.checkout.sessions.create({
    ui_mode: "form",
    integration_identifier: "custom_embedded_web_0001",
    mode: "subscription",
    line_items: lineItems,
    billing_address_collection: "auto",
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    payment_method_collection: "always",
    submit_type: "auto",
    ...(customer
      ? { customer }
      : auth.session.user.email
        ? { customer_email: auth.session.user.email }
        : {}),
    client_reference_id: auth.organizationId,
    // Organizacja na subskrypcji, nie tylko na sesji: późniejsze zdarzenia
    // (odnowienie, rezygnacja) niosą już samą subskrypcję.
    subscription_data: { metadata: { organizationId: auth.organizationId } },
    metadata: { organizationId: auth.organizationId },
    return_url: `${origin}/panel/ustawienia?platnosc={CHECKOUT_SESSION_ID}#plan`,
  });

  return ok({ client_secret: session.client_secret });
}
