import Stripe from "stripe";

import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";

import { PLAN_LEASE_LIMIT } from "./plans";

/**
 * Integracja ze Stripe: klient, ceny planów i zapis subskrypcji w bazie.
 *
 * Źródłem prawdy o płatności jest Stripe — baza trzyma kopię, z której panel
 * czyta plan bez pytania operatora przy każdym żądaniu. Kopię odświeża
 * wyłącznie webhook (`/api/webhooks/stripe`), nigdy powrót z formularza:
 * adres powrotu może otworzyć każdy, podpisane zdarzenie przysyła tylko Stripe.
 */

/**
 * Wersja API z flagą bety formularza płatności (`ui_mode: "form"`).
 *
 * Typy SDK znają tylko najnowszą wersję bez flag, stąd rzutowanie niżej.
 * Formularz w przeglądarce musi iść z tą samą betą (`stripe-checkout.tsx`).
 */
const STRIPE_API_VERSION = "2026-09-30.endive; custom_checkout_payment_form_preview=v1";

let client: Stripe | null | undefined;

/** Klient Stripe albo `null`, gdy płatności nie są skonfigurowane. */
export function stripeClient(): Stripe | null {
  if (client !== undefined) return client;

  client = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
      })
    : null;

  return client;
}

/** Plany, za które się płaci. FREE nie ma ceny w Stripe. */
export const PAID_PLANS = ["START", "PRO", "PORTFOLIO"] as const satisfies readonly SubscriptionPlan[];
export type PaidPlan = (typeof PAID_PLANS)[number];

/**
 * Cenę planu znajdujemy po `lookup_key`, a nie po identyfikatorze `price_…`.
 *
 * Identyfikatory cen różnią się między trybem testowym a live, klucz jest ten
 * sam — wpisuje się go raz przy cenie w panelu Stripe, a podmiana ceny
 * (podwyżka) to przeniesienie klucza na nową cenę, bez wdrożenia.
 *
 * Ceny są na razie tylko w złotówkach. Wersja krajowa bez wpisu tutaj nie
 * widzi zakupu planu — po dodaniu cen w funtach wystarczy dopisać `uk`.
 */
const PRICE_LOOKUP_KEYS: Partial<Record<Locale, Record<PaidPlan, string>>> = {
  pl: { START: "start_monthly", PRO: "pro_monthly", PORTFOLIO: "portfel_monthly" },
};

/** Klucz ceny planu w danej wersji krajowej, `null` = tam jeszcze nie sprzedajemy. */
export function priceLookupKey(plan: PaidPlan, locale: Locale): string | null {
  return PRICE_LOOKUP_KEYS[locale]?.[plan] ?? null;
}

/** Czy wersja krajowa ma ceny w Stripe. */
export function sellsPlansIn(locale: Locale): boolean {
  return PRICE_LOOKUP_KEYS[locale] !== undefined;
}

/** Odwrotność `priceLookupKey` — plan z ceny, którą Stripe przysłał w subskrypcji. */
export function planFromLookupKey(key: string | null | undefined): PaidPlan | null {
  if (!key) return null;

  for (const keys of Object.values(PRICE_LOOKUP_KEYS)) {
    const plan = PAID_PLANS.find((candidate) => keys?.[candidate] === key);
    if (plan) return plan;
  }

  return null;
}

/**
 * Status Stripe → status konta.
 *
 * `incomplete` to subskrypcja, której pierwsza płatność jeszcze nie przeszła
 * (np. 3-D Secure w toku) — planu wtedy nie dajemy, stąd `null`.
 */
function statusFrom(status: Stripe.Subscription.Status): SubscriptionStatus | null {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
    case "paused":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    default:
      return null;
  }
}

/**
 * Przenosi stan subskrypcji ze Stripe do bazy.
 *
 * Wołający podaje identyfikator, a nie obiekt ze zdarzenia — subskrypcję
 * czytamy tu świeżą. Zdarzenia potrafią przyjść w innej kolejności, niż
 * powstały, i starsze `updated` nadpisałoby nowszy stan; odczyt bieżącego
 * stanu sprawia, że kolejność przestaje mieć znaczenie, a powtórka zdarzenia
 * niczego nie psuje.
 *
 * Organizację wskazuje `metadata.organizationId`, zapisane przy zakładaniu
 * sesji płatności; awaryjnie identyfikator klienta zapisany wcześniej w bazie.
 */
export async function syncStripeSubscription(stripe: Stripe, subscriptionId: string): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const organizationId =
    subscription.metadata.organizationId ||
    (
      await prisma.subscription.findFirst({
        where: { externalCustomerId: customerId },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!organizationId) {
    console.error(`[stripe] Subskrypcja ${subscription.id} bez organizacji — pomijam.`);
    return;
  }

  const item = subscription.items.data[0];
  const plan = planFromLookupKey(item?.price.lookup_key);
  const status = statusFrom(subscription.status);

  const current = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { leaseLimit: true, externalSubscriptionId: true, status: true },
  });

  /*
    Starsza, zakończona subskrypcja nie może zdjąć planu nowszej. Zdarza się
    przy rezygnacji i ponownym zakupie: `deleted` starej przychodzi, gdy konto
    ma już nową, aktywną.
  */
  if (
    status === "CANCELLED" &&
    current?.externalSubscriptionId &&
    current.externalSubscriptionId !== subscription.id &&
    current.status !== "CANCELLED"
  ) {
    return;
  }

  const ids = { externalCustomerId: customerId, externalSubscriptionId: subscription.id };

  /*
    Subskrypcja bez planu (pierwsza płatność w toku, nieznana cena) zostawia
    sam identyfikator klienta. Identyfikator subskrypcji wpisujemy dopiero
    razem z planem — po nim panel i API poznają konto, które już płaci,
    a porzucone 3-D Secure zablokowałoby ponowny zakup.
  */
  if (status === null || (status !== "CANCELLED" && plan === null)) {
    if (plan === null && status !== null) {
      console.error(
        `[stripe] Cena ${item?.price.id} bez rozpoznawalnego lookup_key — plan konta ${organizationId} bez zmian.`,
      );
    }
    await prisma.subscription.upsert({
      where: { organizationId },
      create: { organizationId, externalCustomerId: customerId },
      update: { externalCustomerId: customerId },
    });
    return;
  }

  const nextPlan: SubscriptionPlan = status === "CANCELLED" ? "FREE" : plan!;

  /*
    Indywidualny próg zostaje, tylko jeśli jest wyższy niż próg nowego planu —
    konto sprzed cennika z dwudziestoma umowami, które kupi Pro, ma dostać
    trzydzieści, a nie zostać przy swoich dwudziestu.
  */
  const planLimit = PLAN_LEASE_LIMIT[nextPlan];
  const stored = current?.leaseLimit ?? null;
  const leaseLimit = stored !== null && planLimit !== null && stored > planLimit ? stored : null;

  const periodEnd = item?.current_period_end;
  const data = {
    ...ids,
    plan: nextPlan,
    status,
    leaseLimit,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
  };

  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  });
}
