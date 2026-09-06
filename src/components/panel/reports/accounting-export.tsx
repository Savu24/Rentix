"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { EXPORT_SCOPES, type ExportScope } from "@/lib/reports/accounting";

/**
 * Eksport księgowy — wybór okresu i zakresu, potem pobranie pliku.
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{t.lead}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="export-from" label={t.from}>
            <DateInput
              id="export-from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>

          <FormField id="export-to" label={t.to}>
            <DateInput id="export-to" value={to} onChange={(event) => setTo(event.target.value)} />
          </FormField>

          <FormField id="export-scope" label={t.scope}>
            <Select
              id="export-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as ExportScope)}
            >
              {EXPORT_SCOPES.map((option) => (
                <option key={option} value={option}>
                  {t.scopes[option]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild={ready} size="sm" variant="secondary" disabled={!ready}>
            {ready ? (
              <a href={href} download>
                <Download className="h-4 w-4" aria-hidden />
                {t.download}
              </a>
            ) : (
              <span>
                <Download className="h-4 w-4" aria-hidden />
                {t.download}
              </span>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted">{t.note}</p>
      </CardContent>
    </Card>
  );
}
