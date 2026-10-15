"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { PaidPlan } from "@/lib/billing/stripe";
import { useI18n } from "@/lib/i18n/client";

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

/** Wygląd skonfigurowany w Checkout Studio. */
const APPEARANCE = {
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
  initCheckoutFormSdk: (options: { clientSecret: Promise<string>; appearance: unknown }) => CheckoutSdk;
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

export type PlanOption = { plan: PaidPlan; label: string };

export function PlanCheckout({
  publishableKey,
  options,
  subscribed,
  pastDue,
  returned,
  rentFee,
}: {
  publishableKey: string;
  /** Zdanie o opłacie od czynszu, z kwotą już policzoną dla tego konta. */
  rentFee: string;
  /** Plany do kupienia, z ceną już sformatowaną w walucie konta. */
  options: PlanOption[];
  /** Konto ma subskrypcję w Stripe — zamiast zakupu portal płatności. */
  subscribed: boolean;
  pastDue: boolean;
  /** Powrót z formularza (`?platnosc=` w adresie). */
  returned: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.settings.plan.billing;
  const [plan, setPlan] = useState<PaidPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {returned ? <Alert tone="success">{t.returned}</Alert> : null}
      {pastDue ? <Alert tone="warning">{t.pastDue}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {subscribed ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">{t.manageLead}</p>
          <p className="text-xs text-muted">{rentFee}</p>
          <div>
            <Button variant="secondary" size="sm" onClick={openPortal} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t.manage}
            </Button>
          </div>
        </div>
      ) : plan ? (
        <div className="flex flex-col gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setPlan(null)}>
              <ArrowLeft aria-hidden />
              {t.back}
            </Button>
          </div>
          <StripeForm key={plan} plan={plan} publishableKey={publishableKey} />
        </div>
      ) : options.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg">{t.upgradeTitle}</p>
          <p className="text-xs text-muted">{t.upgradeLead}</p>
          <p className="text-xs text-muted">{rentFee}</p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <Button
                key={option.plan}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setError(null);
                  setPlan(option.plan);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
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

        const checkout = stripe.initCheckoutFormSdk({ clientSecret, appearance: APPEARANCE });
        form = checkout.createForm({ layout: "expanded" });
        form.mount("#checkout-form");

        const loadActionsResult = await checkout.loadActions();
        if (cancelled) return;

        if (loadActionsResult.type !== "success") {
          setError(t.formError);
          return;
        }

        form.on("confirm", async (event) => {
          try {
            await loadActionsResult.actions.confirm({ formConfirmEvent: event });
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
      {/* Formularz rysuje się w ramce Stripe — jasne tło niezależnie od motywu panelu. */}
      <div id="checkout-form" className="rounded-md bg-white" hidden={Boolean(error)} />
    </div>
  );
}
