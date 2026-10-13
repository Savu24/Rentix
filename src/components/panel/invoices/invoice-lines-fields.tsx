"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldErrors, UseFieldArrayReturn, UseFormRegister } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import { VAT_PERCENT, vatLabels } from "@/lib/invoices/vat";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { formatMoney, formatMoneyParts, parseMoney } from "@/lib/money";
import type { InvoiceLineFormInput } from "@/lib/validations/invoice";

const VAT_OPTIONS = Object.keys(VAT_PERCENT) as Array<keyof typeof VAT_PERCENT>;

/** Kształt formularza widziany przez pola pozycji — wspólny dla szkicu i wystawienia. */
export type LinesForm = { lines: InvoiceLineFormInput[] };

/* Siatka pozycji na desktopie: opis, ilość, jednostka, cena, VAT, kosz. */
const GRID = "lg:grid-cols-[minmax(0,1fr)_72px_80px_140px_96px_40px]";

/**
 * Pozycje dokumentu jako wiersze pól (redesign/14-dokument-szkic.svg,
 * 15-wystaw-recznie.svg): na desktopie tabela z nagłówkami kolumn, na
 * telefonie każda pozycja jako blok z etykietami. Pod spodem suma.
 *
 * Suma liczy się w przeglądarce tą samą funkcją, co na serwerze
 * (`calculateInvoiceTotals`) — kwota na podglądzie nie może różnić się
 * od tej, która trafi na dokument. Pozycje niekompletne pomijamy:
 * w trakcie pisania kwota i tak by skakała.
 */
export function InvoiceLinesFields({
  idPrefix,
  register,
  errors,
  fieldArray,
  lines,
  busy,
  defaultVat = "ZW",
}: {
  idPrefix: string;
  register: UseFormRegister<LinesForm>;
  errors: FieldErrors<LinesForm>;
  fieldArray: Pick<UseFieldArrayReturn<LinesForm, "lines">, "fields" | "append" | "remove">;
  /** Bieżące wartości pozycji (`useWatch`) — do sumy. */
  lines: Partial<InvoiceLineFormInput>[] | undefined;
  busy: boolean;
  defaultVat?: InvoiceLineFormInput["vatRate"];
}) {
  const { d, locale } = useI18n();
  const m = d.panel.financePage.manualInvoice;
  const { currency } = formatMoneyParts(0, locale);
  const { fields, append, remove } = fieldArray;

  const preview = calculateInvoiceTotals(
    (lines ?? [])
      .map((line) => ({
        description: line?.description ?? "",
        quantityMilli: Math.round(Number(String(line?.quantityMilli ?? "0").replace(",", ".")) * 1000),
        unit: line?.unit ?? d.panel.invoices.defaultUnit,
        unitPriceNetGrosze: parseMoney(String(line?.unitPriceNetGrosze ?? ""), locale) ?? 0,
        vatRate: (line?.vatRate ?? "ZW") as keyof typeof VAT_PERCENT,
      }))
      .filter((line) => line.unitPriceNetGrosze > 0 && line.quantityMilli > 0),
  );

  const lineError = (index: number) => errors.lines?.[index];
  const id = (index: number, field: string) => `${idPrefix}-line-${index}-${field}`;

  return (
    <>
      <div className="flex flex-col gap-3 px-5 lg:px-7">
        {/* Nagłówki kolumn tylko na desktopie; na telefonie każde pole ma własną etykietę. */}
        <div className={`hidden gap-3 text-[12.5px] font-[550] text-muted lg:grid ${GRID}`} aria-hidden>
          <span>{m.description}</span>
          <span>{m.quantity}</span>
          <span>{m.unit}</span>
          <span>{m.unitPrice}</span>
          <span>{m.vat}</span>
          <span />
        </div>

        {typeof errors.lines?.message === "string" ? <Alert tone="error">{errors.lines.message}</Alert> : null}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className={`grid grid-cols-2 gap-3 border-b border-border pb-4 last:border-b-0 sm:grid-cols-4 ${GRID} lg:items-start lg:border-0 lg:pb-0`}
          >
            <FormField
              id={id(index, "description")}
              label={m.description}
              labelClassName="lg:sr-only"
              error={lineError(index)?.description?.message}
              className="col-span-2 sm:col-span-4 lg:col-span-1"
            >
              <Input
                {...fieldAria(id(index, "description"), { error: lineError(index)?.description?.message })}
                disabled={busy}
                {...register(`lines.${index}.description`)}
              />
            </FormField>

            <FormField
              id={id(index, "qty")}
              label={m.quantity}
              labelClassName="lg:sr-only"
              error={lineError(index)?.quantityMilli?.message}
            >
              <Input
                {...fieldAria(id(index, "qty"), { error: lineError(index)?.quantityMilli?.message })}
                inputMode="decimal"
                className="font-mono"
                disabled={busy}
                {...register(`lines.${index}.quantityMilli`)}
              />
            </FormField>

            <FormField
              id={id(index, "unit")}
              label={m.unit}
              labelClassName="lg:sr-only"
              error={lineError(index)?.unit?.message}
            >
              <Input
                {...fieldAria(id(index, "unit"), { error: lineError(index)?.unit?.message })}
                disabled={busy}
                {...register(`lines.${index}.unit`)}
              />
            </FormField>

            <FormField
              id={id(index, "price")}
              label={m.unitPrice}
              labelClassName="lg:sr-only"
              error={lineError(index)?.unitPriceNetGrosze?.message}
              className="col-span-2 sm:col-span-1"
            >
              <div className="relative">
                <Input
                  {...fieldAria(id(index, "price"), { error: lineError(index)?.unitPriceNetGrosze?.message })}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-9 font-mono"
                  disabled={busy}
                  {...register(`lines.${index}.unitPriceNetGrosze`)}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
                  {currency}
                </span>
              </div>
            </FormField>

            <div className="col-span-2 flex items-end gap-2 sm:col-span-1 lg:contents">
              <FormField
                id={id(index, "vat")}
                label={m.vat}
                labelClassName="lg:sr-only"
                error={lineError(index)?.vatRate?.message}
                className="flex-1"
              >
                <Select
                  {...fieldAria(id(index, "vat"), { error: lineError(index)?.vatRate?.message })}
                  disabled={busy}
                  {...register(`lines.${index}.vatRate`)}
                >
                  {VAT_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {vatLabels(d)[rate]}
                    </option>
                  ))}
                </Select>
              </FormField>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="hover:text-bad"
                aria-label={fill(d.panel.panelMisc.removeLine, { index: index + 1 })}
                onClick={() => remove(index)}
                // Ostatniej pozycji nie da się usunąć — dokument bez żadnej
                // i tak odbiłby się o walidację.
                disabled={busy || fields.length === 1}
              >
                <Trash2 className="size-[18px]" aria-hidden />
              </Button>
            </div>
          </div>
        ))}

        <div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="-ml-3"
            onClick={() =>
              append({
                description: "",
                quantityMilli: "1",
                unit: d.panel.invoices.defaultUnit,
                unitPriceNetGrosze: "",
                vatRate: defaultVat,
              })
            }
            disabled={busy || fields.length >= 50}
          >
            <Plus className="size-4" aria-hidden />
            {m.addLine}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border px-5 py-5 lg:px-7">
        <span className="text-[15px] font-semibold text-fg">{d.panel.financePage.detail.totalDue}</span>
        <span className="font-mono text-xl font-[650] tracking-[-0.4px] whitespace-nowrap text-fg lg:text-2xl">
          {formatMoney(preview.totalGrossGrosze, locale)}
        </span>
      </div>
    </>
  );
}
