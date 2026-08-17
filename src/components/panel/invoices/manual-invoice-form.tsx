"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import { VAT_LABEL, VAT_PERCENT } from "@/lib/invoices/vat";
import { formatPLN, parsePLN } from "@/lib/money";
import {
  INVOICE_KIND_LABEL,
  invoiceCreateSchema,
  type InvoiceCreateInput,
  type InvoiceCreateOutput,
} from "@/lib/validations/invoice";

export type ManualInvoiceLease = {
  id: string;
  label: string;
  rentGrosze: number;
};

const KIND_OPTIONS = ["BILL", "VAT_INVOICE", "CHARGE", "PROFORMA"] as const;
const VAT_OPTIONS = Object.keys(VAT_PERCENT) as Array<keyof typeof VAT_PERCENT>;

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const emptyLine = () => ({
  description: "",
  quantityMilli: "1",
  unit: "szt.",
  unitPriceNetGrosze: "",
  vatRate: "ZW" as const,
});

/**
 * Ręczne wystawienie dokumentu.
 *
 * Naliczanie automatyczne obsługuje czynsz i zaliczkę z umowy; to jest droga
 * dla wszystkiego, co się w tamten schemat nie mieści — kaucji, rozliczenia
 * mediów, refaktury za naprawę, korekty. Stąd pełna kontrola nad pozycjami,
 * cenami i wszystkimi trzema datami.
 *
 * Suma liczy się w przeglądarce tą samą funkcją, co na serwerze
 * (`calculateInvoiceTotals`) — dzięki temu kwota na podglądzie nie może
 * różnić się od tej, która trafi na dokument.
 */
export function ManualInvoiceForm({
  tenantId,
  tenantName,
  leases,
}: {
  tenantId: string;
  tenantName: string;
  leases: ManualInvoiceLease[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceCreateInput, unknown, InvoiceCreateOutput>({
    resolver: zodResolver(invoiceCreateSchema),
    defaultValues: {
      tenantId,
      leaseId: leases[0]?.id ?? "",
      kind: "BILL",
      issueDate: today(),
      saleDate: today(),
      dueDate: inDays(7),
      periodStart: "",
      periodEnd: "",
      lines: [emptyLine()],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });

  // Podgląd sumy z tego, co już wpisane. Pozycje niekompletne pomijamy —
  // w trakcie pisania kwota i tak by skakała.
  const preview = calculateInvoiceTotals(
    (watchedLines ?? [])
      .map((line) => ({
        description: line?.description ?? "",
        quantityMilli: Math.round(Number(String(line?.quantityMilli ?? "0").replace(",", ".")) * 1000),
        unit: line?.unit ?? "szt.",
        unitPriceNetGrosze: parsePLN(String(line?.unitPriceNetGrosze ?? "")) ?? 0,
        vatRate: (line?.vatRate ?? "ZW") as keyof typeof VAT_PERCENT,
      }))
      .filter((line) => line.unitPriceNetGrosze > 0 && line.quantityMilli > 0),
  );

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);

    const result = await api.post<{ id: string }>("/api/invoices", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as never, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    router.push(`/panel/finanse/${result.data.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FilePlus2 className="h-4 w-4" aria-hidden />
        Wystaw ręcznie
      </Button>
    );
  }

  return (
    <Card className="border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">Nowy dokument dla: {tenantName}</p>
          <p className="mt-0.5 text-xs text-muted">
            Do kaucji, rozliczenia mediów, refaktury albo korekty — wszystkiego, czego nie
            obejmuje naliczanie czynszu z umowy.
          </p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="mi-kind" label="Rodzaj dokumentu" error={errors.kind?.message}>
              <Select
                {...fieldAria("mi-kind", { error: errors.kind?.message })}
                disabled={isSubmitting}
                {...register("kind")}
              >
                {KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {INVOICE_KIND_LABEL[kind]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="mi-leaseId"
              label="Umowa"
              error={errors.leaseId?.message}
              hint="Puste = dokument jednorazowy, poza umową."
            >
              <Select
                {...fieldAria("mi-leaseId", { error: errors.leaseId?.message })}
                disabled={isSubmitting}
                {...register("leaseId")}
              >
                <option value="">— bez umowy —</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="mi-issueDate" label="Data wystawienia" error={errors.issueDate?.message}>
              <Input
                {...fieldAria("mi-issueDate", { error: errors.issueDate?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("issueDate")}
              />
            </FormField>

            <FormField
              id="mi-saleDate"
              label="Data sprzedaży"
              error={errors.saleDate?.message}
              hint="Dzień wykonania usługi."
            >
              <Input
                {...fieldAria("mi-saleDate", { error: errors.saleDate?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("saleDate")}
              />
            </FormField>

            <FormField id="mi-dueDate" label="Termin płatności" error={errors.dueDate?.message}>
              <Input
                {...fieldAria("mi-dueDate", { error: errors.dueDate?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("dueDate")}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="mi-periodStart"
              label="Okres od"
              error={errors.periodStart?.message}
              hint="Opcjonalne — gdy dokument dotyczy okresu."
            >
              <Input
                {...fieldAria("mi-periodStart", { error: errors.periodStart?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("periodStart")}
              />
            </FormField>

            <FormField id="mi-periodEnd" label="Okres do" error={errors.periodEnd?.message}>
              <Input
                {...fieldAria("mi-periodEnd", { error: errors.periodEnd?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("periodEnd")}
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-fg">Pozycje</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => append(emptyLine())}
                disabled={isSubmitting || fields.length >= 50}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Dodaj pozycję
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
                  id={`mi-line-${index}-description`}
                  label="Opis"
                  error={errors.lines?.[index]?.description?.message}
                  className="sm:col-span-12"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-description`, {
                      error: errors.lines?.[index]?.description?.message,
                    })}
                    placeholder="Kaucja zabezpieczająca"
                    disabled={isSubmitting}
                    {...register(`lines.${index}.description`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-qty`}
                  label="Ilość"
                  error={errors.lines?.[index]?.quantityMilli?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-qty`, {
                      error: errors.lines?.[index]?.quantityMilli?.message,
                    })}
                    inputMode="decimal"
                    disabled={isSubmitting}
                    {...register(`lines.${index}.quantityMilli`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-unit`}
                  label="Jedn."
                  error={errors.lines?.[index]?.unit?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-unit`, {
                      error: errors.lines?.[index]?.unit?.message,
                    })}
                    disabled={isSubmitting}
                    {...register(`lines.${index}.unit`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-price`}
                  label="Cena netto"
                  error={errors.lines?.[index]?.unitPriceNetGrosze?.message}
                  className="sm:col-span-4"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-price`, {
                      error: errors.lines?.[index]?.unitPriceNetGrosze?.message,
                    })}
                    inputMode="decimal"
                    placeholder="2 400,00"
                    disabled={isSubmitting}
                    {...register(`lines.${index}.unitPriceNetGrosze`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-vat`}
                  label="VAT"
                  error={errors.lines?.[index]?.vatRate?.message}
                  className="sm:col-span-3"
                >
                  <Select
                    {...fieldAria(`mi-line-${index}-vat`, {
                      error: errors.lines?.[index]?.vatRate?.message,
                    })}
                    disabled={isSubmitting}
                    {...register(`lines.${index}.vatRate`)}
                  >
                    {VAT_OPTIONS.map((rate) => (
                      <option key={rate} value={rate}>
                        {VAT_LABEL[rate]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Usuń pozycję ${index + 1}`}
                    onClick={() => remove(index)}
                    // Ostatniej pozycji nie da się usunąć — dokument bez
                    // żadnej i tak odbiłby się o walidację.
                    disabled={isSubmitting || fields.length === 1}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {leases[0] ? (
            <div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  // Skrót na najczęstszy przypadek: kaucja równa czynszowi.
                  setValue("lines.0.description", "Kaucja zabezpieczająca");
                  setValue(
                    "lines.0.unitPriceNetGrosze",
                    (leases[0]!.rentGrosze / 100).toFixed(2).replace(".", ","),
                  );
                }}
              >
                Wypełnij jako kaucję ({formatPLN(leases[0].rentGrosze)})
              </Button>
            </div>
          ) : null}

          <FormField id="mi-notes" label="Uwagi na dokumencie" error={errors.notes?.message}>
            <Textarea
              {...fieldAria("mi-notes", { error: errors.notes?.message })}
              placeholder="Opcjonalne."
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-alt px-3.5 py-3">
            <span className="text-sm text-muted">Razem do zapłaty</span>
            <span className="tabular font-mono text-[17px] font-semibold text-fg">
              {formatPLN(preview.totalGrossGrosze)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Wystaw dokument
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setFormError(null);
                reset();
              }}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
