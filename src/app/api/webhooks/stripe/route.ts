import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { apiError, ok } from "@/lib/api/response";
import { stripeClient, syncStripeSubscription } from "@/lib/billing/stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe — jedyna droga, którą płatność zmienia plan konta.
 *
 * Podpis sprawdzamy na surowej treści żądania (`request.text()`), zanim
 * cokolwiek ją sparsuje: po `JSON.parse` i ponownym zapisie bajty się różnią
 * i weryfikacja zawsze pada. Bez sekretu endpoint odmawia — niepodpisane
 * zdarzenie pozwalałoby każdemu nadać sobie plan Portfel.
 *
 * Wszystkie obsłużone zdarzenia sprowadzają się do jednego: przeczytaj
 * bieżący stan subskrypcji i zapisz go (`syncStripeSubscription`). Dzięki
 * temu ponowienie i zła kolejność zdarzeń niczego nie psują.
 */
export async function POST(request: NextRequest) {
  const stripe = stripeClient();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return apiError("INTERNAL_ERROR", "Płatności Stripe nie są skonfigurowane.");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return apiError("VALIDATION_ERROR", "Brak podpisu Stripe.");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return apiError("VALIDATION_ERROR", "Nieprawidłowy podpis Stripe.");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (session.mode === "subscription" && subscriptionId) {
        await syncStripeSubscription(stripe, subscriptionId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncStripeSubscription(stripe, event.data.object.id);
      break;
    default:
      // Zdarzenia spoza listy potwierdzamy — inaczej Stripe ponawiałby je
      // przez trzy dni i w końcu wyłączył endpoint.
      break;
  }

  return ok({ received: true });
}
