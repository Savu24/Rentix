"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { formatAmount, formatMoney } from "@/lib/money";

/**
 * Odhaczenie wpłaty jednym kliknięciem — z listy dokumentów i z kartoteki
 * najemcy.
 *
 * Zapisuje całą brakującą kwotę przelewem z dzisiejszą datą — to przypadek,
 * który przy przeglądaniu listy zdarza się najczęściej. Nietypowa wpłata
 * (część kwoty, gotówka, inna data) zostaje na karcie dokumentu.
 *
 * Bez potwierdzenia: pomyłkę usuwa się jednym kliknięciem przy wpłacie
 * na karcie dokumentu, a dodatkowy krok kosztowałby przy każdym wierszu.
 */
export function MarkPaid({
  invoiceId,
  remainingGrosze,
}: {
  invoiceId: string;
  remainingGrosze: number;
}) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);

    const result = await api.post(`/api/invoices/${invoiceId}/payments`, {
      amountGrosze: formatAmount(remainingGrosze, locale),
      paidAt: new Date().toISOString().slice(0, 10),
      method: "TRANSFER",
      reference: "",
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  const label = fill(d.panel.financePage.markPaid, {
    amount: formatMoney(remainingGrosze, locale),
  });

  return (
    <button
      type="button"
      onClick={pay}
      disabled={busy}
      title={error ?? label}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
        error
          ? "border-bad text-bad"
          : "border-border text-muted hover:border-good hover:bg-good-soft hover:text-good"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
