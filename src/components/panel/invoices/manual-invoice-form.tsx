"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { usePlanAllows } from "@/lib/billing/client";
import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import { VAT_PERCENT, vatLabels } from "@/lib/invoices/vat";
import { formatAmount, formatMoney, parseMoney } from "@/lib/money";
import {
  invoiceKindLabels,
  selectableInvoiceKinds,
  invoiceCreateSchema,
  type InvoiceCreateInput,
  type InvoiceCreateOutput,
} from "@/lib/validations/invoice";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
export type ManualInvoiceLease = {
  id: string;
  label: string;
  rentGrosze: number;
};

const VAT_OPTIONS = Object.keys(VAT_PERCENT) as Array<keyof typeof VAT_PERCENT>;

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/* Jednostka domyślna zależy od kraju („szt." / „item"), więc wchodzi z zewnątrz. */
const emptyLine = (unit: string) => ({
  description: "",
  quantityMilli: "1",
  unit,
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
  const { d, locale } = useI18n();
  const t = d.panel.financePage.manualInvoice;
  const v = useValidationContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /*
    Wysylka nie jest polem dokumentu, tylko czynnoscia wykonywana po jego
    wystawieniu — stad zwykly stan komponentu, a nie pole formularza. Domyslnie
    odznaczone: maila nie da sie cofnac, wiec wychodzi wtedy, gdy ktos o to
    poprosil, a nie wtedy, gdy zapomnial odznaczyc.
  */
  const [sendEmail, setSendEmail] = useState(false);

  /*
    Wysyłka mailem wchodzi z planem Start. Bez niej pole znika, a nie stoi
    wyszarzone: zaznaczyć się go i tak nie da, a puste pole z kłódką przy
    formularzu wystawiania dokumentu tłumaczyłoby cennik w złym miejscu —
    od tego jest kłódka przy gotowym dokumencie.
  */
  const canSendEmail = usePlanAllows("EMAIL_DELIVERY");

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
    resolver: zodResolver(invoiceCreateSchema(v)),
    defaultValues: {
      tenantId,
      leaseId: leases[0]?.id ?? "",
      kind: "BILL",
      issueDate: today(),
      saleDate: today(),
      dueDate: inDays(7),
      periodStart: "",
      periodEnd: "",
      lines: [emptyLine(d.panel.invoices.defaultUnit)],
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
        unit: line?.unit ?? d.panel.invoices.defaultUnit,
        unitPriceNetGrosze: parseMoney(String(line?.unitPriceNetGrosze ?? ""), locale) ?? 0,
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

    /*
      Wysyłka po wystawieniu, osobnym żądaniem.

      Nie w jednej transakcji z wystawieniem, bo to dwie różne rzeczy pod
      względem odwracalności: dokument da się anulować, wysłanego maila nie.
      Gdyby wysyłka jechała razem z zapisem, jej błąd musiałby albo wywrócić
      wystawiony już dokument, albo zostać przemilczany. Osobno wolno nam
      powiedzieć wprost: dokument jest, poczta nie poszła.
    */
    if (sendEmail && canSendEmail) {
      const sent = await api.post<{ toEmail: string }>(
        `/api/invoices/${result.data.id}/send`,
        {},
      );

      if (!sent.ok) {
        setFormError(fill(d.panel.panelMisc.issuedButNotSent, { error: sent.message }));
        return;
      }
    }

    router.push(`/panel/finanse/${result.data.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FilePlus2 className="h-4 w-4" aria-hidden />
        {t.open}
      </Button>
    );
  }

  return (
    <Card className="border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">Nowy dokument dla: {tenantName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t.lead}
          </p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="mi-kind" label={t.kind} error={errors.kind?.message}>
              <Select
                {...fieldAria("mi-kind", { error: errors.kind?.message })}
                disabled={isSubmitting}
                {...register("kind")}
              >
                {selectableInvoiceKinds(locale).map((kind) => (
                  <option key={kind} value={kind}>
                    {invoiceKindLabels(d)[kind]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="mi-leaseId"
              label={t.lease}
              error={errors.leaseId?.message}
              hint={t.leaseHint}
            >
              <Select
                {...fieldAria("mi-leaseId", { error: errors.leaseId?.message })}
                disabled={isSubmitting}
                {...register("leaseId")}
              >
                <option value="">{t.noLease}</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="mi-issueDate" label={t.issueDate} error={errors.issueDate?.message}>
              <DateInput
                {...fieldAria("mi-issueDate", { error: errors.issueDate?.message })}
                disabled={isSubmitting}
                {...register("issueDate")}
              />
            </FormField>

            <FormField
              id="mi-saleDate"
              label={t.saleDate}
              error={errors.saleDate?.message}
              hint={t.saleDateHint}
            >
              <DateInput
                {...fieldAria("mi-saleDate", { error: errors.saleDate?.message })}
                disabled={isSubmitting}
                {...register("saleDate")}
              />
            </FormField>

            <FormField id="mi-dueDate" label={t.dueDate} error={errors.dueDate?.message}>
              <DateInput
                {...fieldAria("mi-dueDate", { error: errors.dueDate?.message })}
                disabled={isSubmitting}
                {...register("dueDate")}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="mi-periodStart"
              label={t.periodFrom}
              error={errors.periodStart?.message}
              hint={t.periodFromHint}
            >
              <DateInput
                {...fieldAria("mi-periodStart", { error: errors.periodStart?.message })}
                disabled={isSubmitting}
                {...register("periodStart")}
              />
            </FormField>

            <FormField id="mi-periodEnd" label={t.periodTo} error={errors.periodEnd?.message}>
              <DateInput
                {...fieldAria("mi-periodEnd", { error: errors.periodEnd?.message })}
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
                onClick={() => append(emptyLine(d.panel.invoices.defaultUnit))}
                disabled={isSubmitting || fields.length >= 50}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t.addLine}
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
                  label={t.description}
                  error={errors.lines?.[index]?.description?.message}
                  className="sm:col-span-12"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-description`, {
                      error: errors.lines?.[index]?.description?.message,
                    })}
                    disabled={isSubmitting}
                    {...register(`lines.${index}.description`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-qty`}
                  label={t.quantity}
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
                  label={t.unit}
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
                  label={t.unitPrice}
                  error={errors.lines?.[index]?.unitPriceNetGrosze?.message}
                  className="sm:col-span-4"
                >
                  <Input
                    {...fieldAria(`mi-line-${index}-price`, {
                      error: errors.lines?.[index]?.unitPriceNetGrosze?.message,
                    })}
                    inputMode="decimal"
                    disabled={isSubmitting}
                    {...register(`lines.${index}.unitPriceNetGrosze`)}
                  />
                </FormField>

                <FormField
                  id={`mi-line-${index}-vat`}
                  label={t.vat}
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
                  setValue("lines.0.description", t.depositLine);
                  setValue(
                    "lines.0.unitPriceNetGrosze",
                    formatAmount(leases[0]!.rentGrosze, locale),
                  );
                }}
              >
                {fill(d.panel.panelMisc.fillAsDeposit, {
                  amount: formatMoney(leases[0].rentGrosze, locale),
                })}
              </Button>
            </div>
          ) : null}

          <FormField id="mi-notes" label={t.notes} error={errors.notes?.message}>
            <Textarea
              {...fieldAria("mi-notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-alt px-3.5 py-3">
            <span className="text-sm text-muted">{t.total}</span>
            <span className="tabular font-mono text-[17px] font-semibold text-fg">
              {formatMoney(preview.totalGrossGrosze, locale)}
            </span>
          </div>

          {canSendEmail ? (
            <CheckboxField
              label={fill(d.panel.panelMisc.sendByEmailTo, { tenant: tenantName })}
              hint={t.sendHint}
              checked={sendEmail}
              disabled={isSubmitting}
              onChange={(event) => setSendEmail(event.target.checked)}
            />
          ) : null}

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {sendEmail && canSendEmail ? t.issueAndSend : t.issue}
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
