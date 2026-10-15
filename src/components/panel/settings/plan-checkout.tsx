"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { SubscriptionPlan } from "@/generated/prisma/enums";
import type { PaidPlan } from "@/lib/billing/stripe";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Zakup planu formularzem Stripe osadzonym w ustawieniach konta.
 *
 * Stripe.js ładujemy z `js.stripe.com` przy pierwszym otwarciu formularza —
 * nigdy z własnego bundla (wymóg PCI), i nie na każdej stronie panelu, bo
 * potrzebuje go tylko ta jedna karta. Wersja `dahlia` jest wymagana przez
 * `initCheckoutFormSdk`, a beta musi zgadzać się z wersją API po stronie
 * serwera (`src/lib/billing/stripe.ts`).
 *
 * Po potwierdzeniu Stripe przekierowuje na adres powrotu z sesji, a plan
 * zmienia webhook — ten komponent niczego w koncie nie zapisuje.
 */

const STRIPE_JS = "https://js.stripe.com/dahlia/stripe.js";

/**
 * Geist z Google Fonts — formularz siedzi w ramce Stripe, która nie widzi
 * fontów strony (`next/font` hostuje je pod własną, haszowaną nazwą).
 */
const FONTS = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" }];

/**
 * Wygląd formularza z kolorów panelu.
 *
 * Ramka Stripe nie dziedziczy CSS-a strony, a `appearance` przyjmuje tylko
 * gotowe kolory, nie `var(--…)`. Czytamy więc żetony motywu z `<html>` w chwili
 * otwarcia formularza — dzięki temu ten sam kod daje jasny formularz w jasnym
 * motywie i ciemny w ciemnym, bez drugiej palety do utrzymania.
 */
/** Wygląd z Checkout Studio — ostatnia deska ratunku, z nim formularz zawsze startował. */
const STUDIO_APPEARANCE = {
  theme: "stripe",
  labels: "auto",
  inputs: "spaced",
  variables: {
    borderRadius: "4px",
    colorBackground: "#ffffff",
    colorDanger: "#df1b41",
    colorPrimary: "#0570de",
    colorSuccess: "#00c853",
    colorText: "#30313d",
    fontFamily: "default",
    fontSizeBase: "16px",
    spacingUnit: "4px",
  },
};

/**
 * Kolejne próby wyglądu: od pełnego (kolory, reguły, Geist) do coraz
 * prostszego. Kolory panelu zostają tak długo, jak się da — Studio jest
 * dopiero ostatnią próbą.
 */
function checkoutAppearanceAttempts(): Array<{ appearance: unknown; fonts?: unknown }> {
  const full = appearanceFromTheme();
  const withoutRules = {
    theme: full.theme,
    labels: full.labels,
    inputs: full.inputs,
    variables: full.variables,
  };
  const basic = {
    theme: "stripe",
    labels: "auto",
    inputs: "spaced",
    variables: {
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      borderRadius: "8px",
      colorPrimary: full.variables.colorPrimary,
      colorBackground: full.variables.colorBackground,
      colorText: full.variables.colorText,
      colorDanger: full.variables.colorDanger,
    },
  };

  return [
    { appearance: full, fonts: FONTS },
    { appearance: full },
    { appearance: withoutRules },
    { appearance: basic },
    { appearance: STUDIO_APPEARANCE },
  ];
}

function appearanceFromTheme() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

  const surface = token("--surface", "#ffffff");
  const ink = token("--ink", "#14241c");
  const ink2 = token("--ink-2", "#56615a");
  const ink3 = token("--ink-3", "#8a928c");
  const line = token("--line-2", "#cdd2c6");
  const primary = token("--primary", "#1b4d3e");

  return {
    theme: "stripe",
    labels: "above",
    inputs: "spaced",
    variables: {
      fontFamily: '"Geist", "Segoe UI", system-ui, sans-serif',
      fontSizeBase: "15px",
      fontWeightNormal: "400",
      fontWeightMedium: "550",
      borderRadius: "8px",
      spacingUnit: "4px",
      colorPrimary: primary,
      colorBackground: surface,
      colorText: ink,
      colorTextSecondary: ink2,
      colorTextPlaceholder: ink3,
      colorDanger: token("--bad", "#b83a2c"),
      colorSuccess: token("--good", "#23794a"),
      colorIcon: ink2,
    },
    rules: {
      ".Input": { border: `1px solid ${line}`, boxShadow: "none" },
      ".Input:focus": { borderColor: primary },
      ".Label": { color: ink2, fontWeight: "500", fontSize: "13.5px" },
      ".Tab": { border: `1px solid ${line}`, boxShadow: "none" },
      ".Tab--selected": { borderColor: primary, color: ink },
    },
  };
}

// Stripe.js nie ma jeszcze typów dla bety formularza — opisujemy tylko to,
// czego tu używamy.
type CheckoutForm = {
  mount: (target: string) => void;
  on: (event: "confirm", handler: (event: unknown) => void) => void;
  unmount?: () => void;
  destroy?: () => void;
};
type LoadActionsResult =
  | { type: "success"; actions: { confirm: (options: { formConfirmEvent: unknown }) => Promise<unknown> } }
  | { type: "error"; error: { message?: string } };
type CheckoutSdk = {
  createForm: (options: { layout: "expanded" }) => CheckoutForm;
  loadActions: () => Promise<LoadActionsResult>;
};
type StripeInstance = {
  initCheckoutFormSdk: (options: {
    clientSecret: Promise<string>;
    appearance: unknown;
    fonts?: unknown;
  }) => CheckoutSdk;
};
type StripeFactory = (key: string, options: { betas: string[] }) => StripeInstance;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

let stripeJs: Promise<StripeFactory> | null = null;

function loadStripeJs(): Promise<StripeFactory> {
  if (window.Stripe) return Promise.resolve(window.Stripe);

  stripeJs ??= new Promise<StripeFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = STRIPE_JS;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js")));
    script.onerror = () => {
      // Następna próba ma załadować skrypt od nowa, a nie dostać ten sam błąd.
      stripeJs = null;
      reject(new Error("Stripe.js"));
    };
    document.head.appendChild(script);
  });

  return stripeJs;
}

/** Jeden próg w siatce planów — teksty już sformatowane po stronie serwera. */
export type PlanTier = {
  plan: SubscriptionPlan;
  name: string;
  /** Limit umów: „2”, „10”, „∞”. */
  limit: string;
  /** Cena samego planu: „39 zł”. */
  price: string;
  /** Napis na przycisku zakupu (z ceną razem z opłatą od czynszu); `null` = nie do kupienia. */
  cta: string | null;
  current: boolean;
};

export function PlanCheckout({
  publishableKey,
  tiers,
  feeNote,
  subscribed,
  pastDue,
  returned,
  requestedPlan = null,
}: {
  publishableKey: string;
  /** Wszystkie progi w kolejności cennika; wybierać można te z `cta`. */
  tiers: PlanTier[];
  /** Jedno zdanie o opłacie od czynszu, z kwotą tego konta. */
  feeNote: string;
  /** Konto ma subskrypcję w Stripe — zamiast zakupu portal płatności. */
  subscribed: boolean;
  pastDue: boolean;
  /** Powrót z formularza (`?platnosc=` w adresie). */
  returned: boolean;
  /** Plan wybrany w cenniku (`?plan=`) — zaznaczony i od razu z otwartą płatnością. */
  requestedPlan?: string | null;
}) {
  const { d } = useI18n();
  const t = d.panel.settings.plan.billing;
  const tCard = d.panel.settings.plan;
  const buyable = tiers.filter((tier) => tier.cta !== null);
  /*
    Plan z cennika (`?plan=`), o ile da się go kupić — klient kliknął już
    „Wybierz Pro”, więc formularz płatności otwiera się od razu. Bez niego
    zaznaczony jest najbliższy wyższy próg: jedno kliknięcie mniej
    w najczęstszym przypadku, a wybór da się zmienić jednym stuknięciem.
  */
  const requested = buyable.find((tier) => tier.plan === requestedPlan) ?? null;
  const [selected, setSelected] = useState<SubscriptionPlan | null>(
    requested?.plan ?? buyable[0]?.plan ?? null,
  );
  const [plan, setPlan] = useState<PaidPlan | null>(
    subscribed ? null : ((requested?.plan as PaidPlan | undefined) ?? null),
  );

  // Przejście z cennika: karta planu bywa pod formularzami (na telefonie
  // zawsze), więc przewijamy do niej, żeby płatność nie czekała poza ekranem.
  useEffect(() => {
    if (requested) document.getElementById("plan")?.scrollIntoView({ block: "start" });
  }, [requested]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTier = buyable.find((tier) => tier.plan === selected) ?? null;

  async function openPortal() {
    setBusy(true);
    setError(null);
    const result = await api.post<{ url: string }>("/api/billing/portal", {});
    if (result.ok) {
      window.location.assign(result.data.url);
      return;
    }
    setBusy(false);
    setError(result.message);
  }

  const alerts = (
    <>
      {returned ? <Alert tone="success">{t.returned}</Alert> : null}
      {pastDue ? <Alert tone="warning">{t.pastDue}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );

  // Opłacone konto: siatkę rysuje karta, tu tylko wejście do portalu.
  if (subscribed) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {alerts}
        <Button variant="secondary" block onClick={openPortal} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t.manage}
        </Button>
        <p className="text-[12.5px] text-muted">
          {t.manageLead} {feeNote}
        </p>
      </div>
    );
  }

  if (plan) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {alerts}
        <div>
          <Button variant="ghost" size="sm" onClick={() => setPlan(null)}>
            <ArrowLeft aria-hidden />
            {t.back}
          </Button>
        </div>
        <StripeForm key={plan} plan={plan} publishableKey={publishableKey} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {alerts}

      {/*
        Siatka progów jest zarazem wyborem planu: zamiast drugiej listy
        z przyciskami pod spodem klika się w sam próg. Wyższe progi są
        przyciskami, obecny i niższe tylko informacją.
      */}
      <div
        role="group"
        aria-label={t.choosePlan}
        className="-mx-1 grid grid-cols-4 gap-1 border-t border-border pt-3"
      >
        {tiers.map((tier) => {
          const isSelected = tier.plan === selected;
          const body = (
            <>
              <span
                className={cn(
                  "truncate text-[13px] font-[650]",
                  tier.current ? "text-accent" : isSelected ? "text-fg" : "text-muted",
                )}
              >
                {tier.name}
              </span>
              <span className="font-mono text-[13px] text-subtle">{tier.limit}</span>
              <span
                className={cn("text-[12px] tabular-nums", isSelected ? "text-fg" : "text-subtle")}
              >
                {tier.current ? tCard.current : tier.price}
              </span>
            </>
          );

          if (tier.cta === null) {
            return (
              <div key={tier.plan} className="flex min-w-0 flex-col gap-0.5 px-2 py-2">
                {body}
              </div>
            );
          }

          return (
            <button
              key={tier.plan}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${tier.name}, ${tier.limit}, ${tier.price}`}
              onClick={() => setSelected(tier.plan)}
              className={cn(
                "flex min-w-0 cursor-pointer flex-col gap-0.5 rounded-control border px-2 py-2 text-left",
                "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                isSelected
                  ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--color-accent)]"
                  : "border-border hover:border-border-strong hover:bg-hover",
              )}
            >
              {body}
            </button>
          );
        })}
      </div>

      {selectedTier?.cta ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            block
            onClick={() => {
              setError(null);
              setPlan(selectedTier.plan as PaidPlan);
            }}
          >
            {selectedTier.cta}
          </Button>
          <p className="text-[12.5px] leading-[18px] text-muted">
            {t.terms} {feeNote}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StripeForm({ plan, publishableKey }: { plan: PaidPlan; publishableKey: string }) {
  const { d } = useI18n();
  const t = d.panel.settings.plan.billing;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let form: CheckoutForm | null = null;

    async function start() {
      try {
        const Stripe = await loadStripeJs();
        if (cancelled) return;

        const stripe = Stripe(publishableKey, { betas: ["custom_checkout_payment_form_1"] });

        const clientSecret = api
          .post<{ client_secret: string }>("/api/billing/checkout", { plan })
          .then((result) => {
            if (!result.ok) throw new Error(result.message);
            return result.data.client_secret;
          });
        // Komunikat z serwera („konto zwolnione z opłat") mówi więcej niż ogólny.
        clientSecret.catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : t.formError);
        });

        /*
          Formularz w becie Stripe nie dokumentuje, które opcje wyglądu
          przyjmuje — odrzucona opcja kończy się błędem zamiast pominięciem.
          Próbujemy więc od pełnego wyglądu panelu do coraz prostszego,
          a na końcu do tego z Checkout Studio, który działał zawsze.
          Każde odrzucenie trafia do konsoli z powodem podanym przez Stripe.
        */
        let loadActionsResult: Extract<LoadActionsResult, { type: "success" }> | null = null;
        const attempts = checkoutAppearanceAttempts();

        for (const [index, options] of attempts.entries()) {
          if (cancelled) return;
          try {
            const checkout = stripe.initCheckoutFormSdk({ clientSecret, ...options });
            const candidate = checkout.createForm({ layout: "expanded" });
            candidate.mount("#checkout-form");

            const result = await checkout.loadActions();
            if (result.type === "success") {
              form = candidate;
              loadActionsResult = result;
              break;
            }

            console.error(
              `[stripe] Formularz nie wystartował (wariant wyglądu ${index + 1}/${attempts.length}):`,
              result.error,
            );
            candidate.unmount?.();
            candidate.destroy?.();
          } catch (reason) {
            console.error(
              `[stripe] Stripe odrzucił wygląd formularza (wariant ${index + 1}/${attempts.length}):`,
              reason,
            );
          }
        }

        if (cancelled) return;
        const activeForm: CheckoutForm | null = form;
        if (!activeForm || !loadActionsResult) {
          setError((current) => current ?? t.formError);
          return;
        }

        const { actions } = loadActionsResult;
        activeForm.on("confirm", async (event) => {
          try {
            await actions.confirm({ formConfirmEvent: event });
          } catch (reason) {
            console.error("Payment confirmation error:", reason);
          }
        });
        setReady(true);
      } catch {
        if (!cancelled) setError((current) => current ?? t.formError);
      }
    }

    void start();

    return () => {
      cancelled = true;
      form?.unmount?.();
      form?.destroy?.();
    };
  }, [plan, publishableKey, t.formError]);

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {!ready && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t.loading}
        </p>
      ) : null}
      <div id="checkout-form" hidden={Boolean(error)} />
    </div>
  );
}
