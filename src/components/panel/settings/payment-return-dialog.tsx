"use client";

import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";

/** Co ile sprawdzamy, czy webhook już zmienił plan, i ile razy, zanim uznamy, że to potrwa. */
const POLL_MS = 3000;
const POLL_LIMIT = 20;

/**
 * Okno po powrocie z płatności (`?platnosc=` w adresie).
 *
 * Plan zmienia webhook Stripe, nie sam powrót — między jednym a drugim mija
 * zwykle kilka sekund. Zamiast prosić o odświeżenie strony okno robi to samo:
 * co kilka sekund `router.refresh()` przelicza kartę planu na serwerze, a gdy
 * konto ma już subskrypcję (`active`), okno pokazuje gotowy plan. Po minucie
 * bez zmiany przestajemy pytać i mówimy wprost, że trwa to dłużej.
 *
 * Zamknięcie zdejmuje `?platnosc=` z adresu, żeby odświeżenie strony nie
 * otworzyło okna drugi raz.
 */
export function PaymentReturnDialog({
  active,
  planName,
}: {
  /** Konto ma już opłaconą subskrypcję — webhook dotarł. */
  active: boolean;
  /** Nazwa obecnego planu („Pro”) — po aktywacji to ten kupiony. */
  planName: string;
}) {
  const { d } = useI18n();
  const t = d.panel.settings.plan.billing.returned;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [polls, setPolls] = useState(0);

  const slow = !active && polls >= POLL_LIMIT;

  useEffect(() => {
    if (!open || active || slow) return;
    const timer = window.setTimeout(() => {
      router.refresh();
      setPolls((count) => count + 1);
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [open, active, slow, polls, router]);

  function close() {
    setOpen(false);
    router.replace(`${pathname}#plan`, { scroll: false });
  }

  const title = active ? fill(t.activeTitle, { plan: planName }) : slow ? t.slowTitle : t.pendingTitle;

  return (
    <Dialog open={open} onClose={close} title={title} closeLabel={d.panel.common.close}>
      <DialogBody>
        <div className="flex items-start gap-3.5" aria-live="polite">
          <span
            className={
              active
                ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-good-soft text-good"
                : "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-muted"
            }
            aria-hidden
          >
            {active ? (
              <CheckCircle2 className="size-5" />
            ) : slow ? (
              <Clock className="size-5" />
            ) : (
              <Loader2 className="size-5 animate-spin" />
            )}
          </span>
          <div className="flex flex-col gap-1.5 pt-0.5">
            <p className="text-[15px] leading-6 text-fg">
              {active ? t.activeBody : slow ? t.slowBody : t.pendingBody}
            </p>
            {!active && !slow ? <p className="text-[13px] text-muted">{t.pendingNote}</p> : null}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant={active ? "primary" : "secondary"} onClick={close}>
          {active ? t.done : d.panel.common.close}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
