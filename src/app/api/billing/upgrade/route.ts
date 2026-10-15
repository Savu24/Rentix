import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, ok, validationError } from "@/lib/api/response";
import { membershipRole, requireApiOwner } from "@/lib/auth/session";
import {
  PAID_PLANS,
  planFromLookupKey,
  priceByLookupKey,
  priceLookupKey,
  stripeClient,
  syncStripeSubscription,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const upgradeSchema = z.object({ plan: z.enum(PAID_PLANS) });

/**
 * POST /api/billing/upgrade — wyższy plan dla konta, które już płaci.
 *
 * Podmienia cenę planu w istniejącej subskrypcji, zamiast zakładać drugą —
 * nowa subskrypcja obok starej obciążałaby kartę dwa razy. Opłata od czynszu
 * zostaje nietknięta (to osobna pozycja).
 *
 * Różnicę za resztę bieżącego okresu Stripe pobiera od razu z zapisanej karty
 * (`always_invoice`). Gdy płatność nie przejdzie — np. bank chce 3-D Secure —
 * zmiana się nie zapisuje (`error_if_incomplete`) i odsyłamy do portalu, gdzie
 * klient może potwierdzić płatność albo zmienić kartę.
 *
 * Tylko w górę: zejście na niższy plan to rezygnacja z części funkcji, więc
 * idzie przez portal, a nie jednym kliknięciem w karcie.
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

  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const row = await prisma.subscription.findUnique({
    where: { organizationId: auth.organizationId },
    select: { externalSubscriptionId: true, status: true, plan: true },
  });

  if (!row?.externalSubscriptionId || row.status === "CANCELLED") {
    return apiError("CONFLICT", t.upgradeNoSubscription);
  }

  const rank = (plan: string) => (PAID_PLANS as readonly string[]).indexOf(plan);
  if (rank(parsed.data.plan) <= rank(row.plan)) {
    return apiError("CONFLICT", t.upgradeNotHigher);
  }

  const key = priceLookupKey(parsed.data.plan, auth.locale);
  let price: Awaited<ReturnType<typeof priceByLookupKey>>;
  let subscription: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;
  try {
    price = key ? await priceByLookupKey(stripe, key) : null;
    subscription = await stripe.subscriptions.retrieve(row.externalSubscriptionId, {
      expand: ["items.data.price"],
    });
  } catch (error) {
    console.error("[stripe] Odczyt przed ulepszeniem planu nie przeszedł:", error);
    return apiError("INTERNAL_ERROR", t.unavailable);
  }
  if (!price) return apiError("INTERNAL_ERROR", t.unavailable);

  const planItem = subscription.items.data.find((item) => planFromLookupKey(item.price.lookup_key));
  if (!planItem) {
    console.error(`[stripe] Subskrypcja ${subscription.id} bez pozycji planu.`);
    return apiError("INTERNAL_ERROR", t.unavailable);
  }

  try {
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: planItem.id, price: price.id }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
    });
  } catch (error) {
    console.error(`[stripe] Ulepszenie ${subscription.id} do ${parsed.data.plan} nie przeszło:`, error);
    return apiError("CONFLICT", t.upgradeFailed);
  }

  // Plan w bazie od razu, bez czekania na webhook — karta odświeża się po
  // odpowiedzi. Webhook przyjdzie i tak; zapis jest idempotentny.
  await syncStripeSubscription(stripe, subscription.id);

  return ok({ plan: parsed.data.plan });
}
