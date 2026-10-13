"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { InfoTip } from "@/components/ui/info-tip";
import { useI18n } from "@/lib/i18n/client";
import { EXPORT_SCOPES, type ExportScope } from "@/lib/reports/accounting";
import { cn } from "@/lib/utils";

/**
 * Eksport księgowy — wybór okresu i zakresu, potem pobranie pliku
 * (redesign/18-raporty-desktop.svg, sekcja na dole).
 *
 * Zwykły odnośnik z parametrami, a nie `fetch` z zapisem pliku po stronie
 * przeglądarki: pobieranie zostaje wtedy w rękach przeglądarki, razem z jej
 * paskiem postępu, ponowieniem i historią pobrań. Stan trzyma komponent,
 * bo w adresie strony nie ma czego zapamiętywać — okres wybiera się na raz.
 *
 * Domyślny okres to wybrany rok, ten sam, który pokazuje raport wyżej.
 */
export function AccountingExport({ year }: { year: number }) {
  const { d } = useI18n();
  const t = d.panel.accountingExport;

  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [scope, setScope] = useState<ExportScope>("all");

  const href = `/api/reports/accounting.csv?od=${from}&do=${to}&zakres=${scope}`;
  // Pusta data znaczy „pole w trakcie pisania" — pobranie z takim parametrem
  // wróciłoby cichym zakresem domyślnym zamiast tego, co widać na ekranie.
  const ready = from !== "" && to !== "";

  return (
    <section className="flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:p-6">
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-fg">
        <Download className="size-[18px] shrink-0 text-subtle" aria-hidden />
        {t.title}
        <InfoTip label={t.info}>{t.note}</InfoTip>
      </h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 lg:w-[400px]">
          <FormField id="export-from" label={t.from} labelClassName="lg:sr-only">
            <DateInput id="export-from" value={from} onChange={(event) => setFrom(event.target.value)} />
          </FormField>
          <span className="pb-2.5 text-sm text-subtle" aria-hidden>
            -
          </span>
          <FormField id="export-to" label={t.to} labelClassName="lg:sr-only">
            <DateInput id="export-to" value={to} onChange={(event) => setTo(event.target.value)} />
          </FormField>
        </div>

        <div
          role="radiogroup"
          aria-label={t.scope}
          className="flex flex-wrap gap-1 rounded-[9px] bg-surface-alt p-[3px] lg:mb-[3px] lg:w-fit"
        >
          {EXPORT_SCOPES.map((option) => {
            const active = option === scope;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setScope(option)}
                className={cn(
                  "h-[30px] rounded-[7px] px-3 text-[13px] font-[550] whitespace-nowrap transition-colors",
                  active ? "bg-surface text-fg shadow-btn" : "text-muted hover:text-fg",
                )}
              >
                {t.scopes[option]}
              </button>
            );
          })}
        </div>

        <Button asChild={ready} disabled={!ready} className="lg:ml-auto">
          {ready ? (
            <a href={href} download>
              <Download className="size-[18px]" aria-hidden />
              {t.download}
            </a>
          ) : (
            <span>
              <Download className="size-[18px]" aria-hidden />
              {t.download}
            </span>
          )}
        </Button>
      </div>
    </section>
  );
}
