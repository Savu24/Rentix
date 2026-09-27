"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VatRate } from "@/generated/prisma/enums";
import { api } from "@/lib/api/client";
import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import { VAT_PERCENT, vatLabels } from "@/lib/invoices/vat";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { formatAmount, formatMoney, parseMoney } from "@/lib/money";
import {
  invoiceDraftSchema,
  type InvoiceDraftInput,
  type InvoiceDraftOutput,
} from "@/lib/validations/invoice";

const VAT_OPTIONS = Object.keys(VAT_PERCENT) as Array<keyof typeof VAT_PERCENT>;

export type DraftInvoiceData = {
  id: string;
  /** Daty w zapisie „2026-10-01" — tak, jak je trzyma pole daty. */
  issueDate: string;
  saleDate: string;
  dueDate: string;
  notes: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPriceNetGrosze: number;
    vatRate: VatRate;
  }>;
};

/**
 * Szkic czynszu za niepełny miesiąc — poprawki i zatwierdzenie.
 *
 * Formularz jest pełnym dokumentem, jak przy wystawianiu ręcznym: właściciel
 * poprawia proporcję, dopisuje pozycje (sprzątanie, rozliczenie mediów) albo
 * przesuwa termin. Zatwierdzenie idzie osobnym żądaniem, bo to ono nadaje
 * numer z rejestru — zapis poprawek numeru nie rusza.
 */
export function DraftInvoiceEditor({ invoice }: { invoice: DraftInvoiceData }) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.detail.draft;
  const m = d.panel.financePage.manualInvoice;
  const v = useValidationContext();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues: InvoiceDraftInput = {
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes ?? "",
    lines: invoice.lines.map((line) => ({
      description: line.description,
      // Ilość i cena w zapisie kraju — z przecinkiem tam, gdzie się go pisze.
      quantityMilli: locale === "pl" ? String(line.quantity).replace(".", ",") : String(line.quantity),
      unit: line.unit,
      unitPriceNetGrosze: formatAmount(line.unitPriceNetGrosze, locale),
      vatRate: line.vatRate,
    })),
  };

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceDraftInput, unknown, InvoiceDraftOutput>({
    resolver: zodResolver(invoiceDraftSchema(v)),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });

  const preview = calculateInvoiceTotals(
    (watchedLines ?? [])
      .map((line) => ({
        description: line?.description ?? "",
        quantityMilli: Math.round(Number(String(line?.quantityMilli ?? "0").replace(",", ".")) * 1000),
        unit: line?.unit ?? d.panel.invoices.defaultUnit,
        unitPriceNetGrosze: parseMoney(String(line?.unitPriceNetGrosze ?? ""), locale) ?? 0,
        vatRate: (line?.vatRate ?? "ZW") as keyof typeof VAT_PERCENT,
      }))
      .filter((line) => line.unitPriceNetGrosze > 0 && line.quantityMilli > 0),
  );

  const busy = isSubmitting || issuing;

  /** Zapis poprawek. Zwraca, czy się udał — zatwierdzenie idzie tylko po udanym. */
  async function save(): Promise<boolean> {
    setFormError(null);
    setNotice(null);

    const result = await api.put<{ id: string }>(`/api/invoices/${invoice.id}`, getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as never, { message: messages[0] });
      }
      setFormError(result.message);
      return false;
    }
    return true;
  }

  async function issue() {
    setIssuing(true);
    setFormError(null);
    setNotice(null);

    const result = await api.post<{ id: string; number: string }>(
      `/api/invoices/${invoice.id}/issue`,
      {},
    );

    setIssuing(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    router.refresh();
  }

  async function onSave() {
    if (!(await save())) return;
    setEditing(false);
    setNotice(t.saved);
    router.refresh();
  }

  async function onSaveAndIssue() {
    if (!(await save())) return;
    await issue();
  }

  return (
    <Card className="border-warn/50">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">{t.title}</p>
          <p className="mt-0.5 text-xs text-muted">{t.lead}</p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        {!editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2.5">
              <Button size="sm" onClick={issue} disabled={busy}>
                {issuing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                {t.issue}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setNotice(null);
                  setEditing(true);
                }}
                disabled={busy}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t.edit}
              </Button>
            </div>
            <p className="text-xs text-muted">{t.issueHint}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="di-issueDate" label={m.issueDate} error={errors.issueDate?.message}>
                <DateInput
                  {...fieldAria("di-issueDate", { error: errors.issueDate?.message })}
                  disabled={busy}
                  {...register("issueDate")}
                />
              </FormField>

              <FormField
                id="di-saleDate"
                label={m.saleDate}
                error={errors.saleDate?.message}
                hint={m.saleDateHint}
              >
                <DateInput
                  {...fieldAria("di-saleDate", { error: errors.saleDate?.message })}
                  disabled={busy}
                  {...register("saleDate")}
                />
              </FormField>

              <FormField id="di-dueDate" label={m.dueDate} error={errors.dueDate?.message}>
                <DateInput
                  {...fieldAria("di-dueDate", { error: errors.dueDate?.message })}
                  disabled={busy}
                  {...register("dueDate")}
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    append({
                      description: "",
                      quantityMilli: "1",
                      unit: d.panel.invoices.defaultUnit,
                      unitPriceNetGrosze: "",
                      vatRate: invoice.lines[0]?.vatRate ?? "ZW",
                    })
                  }
                  disabled={busy || fields.length >= 50}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {m.addLine}
                </Button>
              </div>

              {typeof errors.lines?.message === "string" ? (
                <Alert tone="error">{errors.lines.message}</Alert>
              ) : null}

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-control border border-border p-3 sm:grid-cols-12"
                >
                  <FormField
                    id={`di-line-${index}-description`}
                    label={m.description}
                    error={errors.lines?.[index]?.description?.message}
                    className="sm:col-span-12"
                  >
                    <Input
                      {...fieldAria(`di-line-${index}-description`, {
                        error: errors.lines?.[index]?.description?.message,
                      })}
                      disabled={busy}
                      {...register(`lines.${index}.description`)}
                    />
                  </FormField>

                  <FormField
                    id={`di-line-${index}-qty`}
                    label={m.quantity}
                    error={errors.lines?.[index]?.quantityMilli?.message}
                    className="sm:col-span-2"
                  >
                    <Input
                      {...fieldAria(`di-line-${index}-qty`, {
                        error: errors.lines?.[index]?.quantityMilli?.message,
                      })}
                      inputMode="decimal"
                      disabled={busy}
                      {...register(`lines.${index}.quantityMilli`)}
                    />
                  </FormField>

                  <FormField
                    id={`di-line-${index}-unit`}
                    label={m.unit}
                    error={errors.lines?.[index]?.unit?.message}
                    className="sm:col-span-2"
                  >
                    <Input
                      {...fieldAria(`di-line-${index}-unit`, {
                        error: errors.lines?.[index]?.unit?.message,
                      })}
                      disabled={busy}
                      {...register(`lines.${index}.unit`)}
                    />
                  </FormField>

                  <FormField
                    id={`di-line-${index}-price`}
                    label={m.unitPrice}
                    error={errors.lines?.[index]?.unitPriceNetGrosze?.message}
                    className="sm:col-span-4"
                  >
                    <Input
                      {...fieldAria(`di-line-${index}-price`, {
                        error: errors.lines?.[index]?.unitPriceNetGrosze?.message,
                      })}
                      inputMode="decimal"
                      disabled={busy}
                      {...register(`lines.${index}.unitPriceNetGrosze`)}
                    />
                  </FormField>

                  <FormField
                    id={`di-line-${index}-vat`}
                    label={m.vat}
                    error={errors.lines?.[index]?.vatRate?.message}
                    className="sm:col-span-3"
                  >
                    <Select
                      {...fieldAria(`di-line-${index}-vat`, {
                        error: errors.lines?.[index]?.vatRate?.message,
                      })}
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

                  <div className="flex items-end sm:col-span-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={fill(d.panel.panelMisc.removeLine, { index: index + 1 })}
                      onClick={() => remove(index)}
                      disabled={busy || fields.length === 1}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <FormField id="di-notes" label={m.notes} error={errors.notes?.message}>
              <Textarea
                {...fieldAria("di-notes", { error: errors.notes?.message })}
                disabled={busy}
                {...register("notes")}
              />
            </FormField>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-alt px-3.5 py-3">
              <span className="text-sm text-muted">{m.total}</span>
              <span className="tabular font-mono text-[17px] font-semibold text-fg">
                {formatMoney(preview.totalGrossGrosze, locale)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button type="button" size="sm" onClick={handleSubmit(onSaveAndIssue)} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                {t.issue}
              </Button>
              <Button type="submit" size="sm" variant="secondary" disabled={busy}>
                {t.save}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setFormError(null);
                  reset(defaultValues);
                }}
                disabled={busy}
              >
                {t.close}
              </Button>
            </div>
            <p className="text-xs text-muted">{t.issueHint}</p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
