import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { membershipRole, requireApiOwner } from "@/lib/auth/session";
import { stripeClient } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal — wejście do portalu klienta Stripe.
 *
 * Zmiana planu, karty, faktury i rezygnacja dzieją się po stronie Stripe —
 * zmiany wracają do konta tym samym webhookiem co zakup. Rezygnacja musi być
 * dostępna bez pisania do nas: tego wymaga prawo konsumenckie i oba sklepy.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const t = auth.d.panel.settings.plan.billing;

  const role = await membershipRole(auth.session.user.id, auth.organizationId);
  if (role !== "OWNER" && role !== "ADMIN") return apiError("FORBIDDEN", t.managerOnly);

  const stripe = stripeClient();
  if (!stripe) return apiError("INTERNAL_ERROR", t.unavailable);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: auth.organizationId },
    select: { externalCustomerId: true },
  });

  if (!subscription?.externalCustomerId) return apiError("NOT_FOUND", t.noCustomer);

  const origin = env.APP_URL ?? request.nextUrl.origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.externalCustomerId,
    return_url: `${origin}/panel/ustawienia#plan`,
  });

  return ok({ url: session.url });
}
