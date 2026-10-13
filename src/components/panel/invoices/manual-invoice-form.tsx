"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2, NotebookPen, Plus, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type UseFieldArrayAppend,
  type UseFormRegister,
} from "react-hook-form";

import { FormSection } from "@/components/panel/form-section";
import { InvoiceLinesFields, type LinesForm } from "@/components/panel/invoices/invoice-lines-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { usePlanAllows } from "@/lib/billing/client";
import { formatAmount, formatMoney } from "@/lib/money";
import {
  invoiceKindLabels,
  selectableInvoiceKinds,
  invoiceCreateSchema,
  type InvoiceCreateInput,
  type InvoiceCreateOutput,
} from "@/lib/validations/invoice";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { cn, initials } from "@/lib/utils";

export type ManualInvoiceLease = {
  id: string;
  label: string;
  rentGrosze: number;
};

export type ManualInvoiceRecipient = {
  id: string;
  name: string;
  email: string | null;
  leases: ManualInvoiceLease[];
};

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/* Jednostka domyślna zależy od kraju („szt." / „item"), więc wchodzi z zewnątrz. */
const emptyLine = (unit: string) => ({
  description: "",
  quantityMilli: "1",
  unit,
  unitPriceNetGrosze: "",
  vatRate: "ZW" as const,
});

/**
 * Ręczne wystawienie dokumentu (redesign/15-wystaw-recznie.svg).
 *
 * Naliczanie automatyczne obsługuje czynsz i zaliczkę z umowy; to jest droga
 * dla wszystkiego, co się w tamten schemat nie mieści — kaucji, rozliczenia
 * mediów, refaktury za naprawę, korekty. Stąd pełna kontrola nad pozycjami,
 * cenami i wszystkimi trzema datami; data sprzedaży i okres siedzą zwinięte,
 * bo zwykle zostają domyślne.
 *
 * Wysyłka nie jest polem dokumentu, tylko czynnością po jego wystawieniu —
 * stąd dwa przyciski („Tylko wystaw" / „Wystaw i wyślij") zamiast pola
 * wyboru. Maila nie da się cofnąć, więc wychodzi tylko na wyraźne kliknięcie.
 */
export function ManualInvoiceForm({
  recipients,
  initialTenantId,
  cancelHref,
}: {
  recipients: ManualInvoiceRecipient[];
  /** Najemca z karty, z której przyszło wystawienie. */
  initialTenantId: string | null;
  cancelHref: string;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.manualInvoice;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [moreDates, setMoreDates] = useState(false);
  // Którym przyciskiem wysłano formularz — `handleSubmit` nie przekazuje go dalej.
  const sendAfter = useRef(false);
  const [sending, setSending] = useState(false);

  /*
    Wysyłka mailem wchodzi z planem Start. Bez niej przycisk „Wystaw
    i wyślij" znika, a nie stoi wyszarzony — od tłumaczenia cennika jest
    kłódka przy gotowym dokumencie, nie formularz wystawiania.
  */
  const canSendEmail = usePlanAllows("EMAIL_DELIVERY");

  const initial = recipients.find((recipient) => recipient.id === initialTenantId) ?? null;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceCreateInput, unknown, InvoiceCreateOutput>({
    resolver: zodResolver(invoiceCreateSchema(v)),
    defaultValues: {
      tenantId: initial?.id ?? "",
      leaseId: initial?.leases[0]?.id ?? "",
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
  const tenantId = useWatch({ control, name: "tenantId" });
  const leaseId = useWatch({ control, name: "leaseId" });
  const kind = useWatch({ control, name: "kind" });
  const notes = useWatch({ control, name: "notes" });

  const tenant = recipients.find((recipient) => recipient.id === tenantId) ?? null;
  const lease = tenant?.leases.find((entry) => entry.id === leaseId) ?? null;
  // Skrót na najczęstszy przypadek: kaucja równa czynszowi z wybranej umowy.
  const depositLease = lease ?? tenant?.leases[0] ?? null;
  // Wysyłka idzie do najemcy z umowy, na jego adres — bez jednego z nich nie ma dokąd.
  const canSendNow = canSendEmail && Boolean(tenant?.email) && Boolean(lease);

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
    if (sendAfter.current && canSendNow) {
      const sent = await api.post<{ toEmail: string }>(`/api/invoices/${result.data.id}/send`, {});

      if (!sent.ok) {
        setFormError(fill(d.panel.panelMisc.issuedButNotSent, { error: sent.message }));
        return;
      }
    }

    router.push(`/panel/finanse/${result.data.id}`);
    router.refresh();
  }

  function submitWith(send: boolean) {
    sendAfter.current = send;
    setSending(send);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,840px)_minmax(240px,1fr)] lg:gap-8"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <section className="flex flex-col gap-5 rounded-tile border border-border bg-surface p-5 lg:p-7">
          <FormField id="mi-tenantId" label={t.tenant} error={errors.tenantId?.message}>
            <Select
              {...fieldAria("mi-tenantId", { error: errors.tenantId?.message })}
              disabled={isSubmitting}
              {...register("tenantId", {
                // Inny najemca to inne umowy — podpowiadamy jego najnowszą.
                onChange: (event) => {
                  const next = recipients.find((recipient) => recipient.id === event.target.value);
                  setValue("leaseId", next?.leases[0]?.id ?? "");
                },
              })}
            >
              <option value="">{t.chooseTenant}</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex flex-col gap-1">
            <Label id="mi-kind-label">{t.kind}</Label>
            <div
              role="radiogroup"
              aria-labelledby="mi-kind-label"
              className="flex flex-wrap gap-1 rounded-[9px] bg-surface-alt p-[3px] sm:w-fit"
            >
              {selectableInvoiceKinds(locale).map((value) => {
                const active = value === kind;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isSubmitting}
                    onClick={() => setValue("kind", value, { shouldDirty: true })}
                    className={cn(
                      "h-[30px] rounded-[7px] px-3 text-[13px] font-[550] whitespace-nowrap transition-colors",
                      active ? "bg-surface text-fg shadow-btn" : "text-muted hover:text-fg",
                    )}
                  >
                    {invoiceKindLabels(d)[value]}
                  </button>
                );
              })}
            </div>
            {errors.kind?.message ? (
              <p role="alert" className="mt-1 text-[12.5px] font-medium text-bad">
                {errors.kind.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <FormField id="mi-leaseId" label={t.lease} error={errors.leaseId?.message}>
              <Select
                {...fieldAria("mi-leaseId", { error: errors.leaseId?.message })}
                disabled={isSubmitting || !tenant}
                {...register("leaseId")}
              >
                <option value="">{t.noLease}</option>
                {(tenant?.leases ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="mi-issueDate" label={t.issueDate} error={errors.issueDate?.message}>
              <DateInput
                {...fieldAria("mi-issueDate", { error: errors.issueDate?.message })}
                disabled={isSubmitting}
                {...register("issueDate")}
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

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setMoreDates((open) => !open)}
              aria-expanded={moreDates}
              aria-controls="mi-more-dates"
              className="flex w-fit items-center gap-1.5 rounded-btn text-[13.5px] font-[550] text-accent hover:underline"
            >
              <ChevronDown
                className={cn("size-4 transition-transform", moreDates && "rotate-180")}
                strokeWidth={2}
                aria-hidden
              />
              {t.moreDates}
            </button>
            {/* `hidden`, nie odmontowanie: formularz dalej wysyła te pola,
                a błąd w nich otwiera sekcję (aria-invalid niżej). */}
            <div
              id="mi-more-dates"
              hidden={!moreDates && !errors.saleDate && !errors.periodStart && !errors.periodEnd}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <FormField id="mi-saleDate" label={t.saleDate} error={errors.saleDate?.message}>
                <DateInput
                  {...fieldAria("mi-saleDate", { error: errors.saleDate?.message })}
                  disabled={isSubmitting}
                  {...register("saleDate")}
                />
              </FormField>
              <FormField id="mi-periodStart" label={t.periodFrom} error={errors.periodStart?.message}>
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
          </div>
        </section>

        <section className="flex flex-col rounded-tile border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
            <h2 className="text-[17px] font-[650] text-fg">{t.lines}</h2>
            {depositLease ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setValue("lines.0.description", t.depositLine);
                  setValue("lines.0.unitPriceNetGrosze", formatAmount(depositLease.rentGrosze, locale));
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-badge bg-accent-soft px-2.5 text-[12.5px] font-[550] text-accent transition-colors hover:bg-accent-soft/70"
              >
                <Plus className="size-3.5" strokeWidth={2} aria-hidden />
                {fill(d.panel.panelMisc.fillAsDeposit, {
                  amount: formatMoney(depositLease.rentGrosze, locale),
                })}
              </button>
            ) : null}
          </div>
          <InvoiceLinesFields
            idPrefix="mi"
            register={register as unknown as UseFormRegister<LinesForm>}
            errors={errors as FieldErrors<LinesForm>}
            fieldArray={{
              fields,
              append: append as unknown as UseFieldArrayAppend<LinesForm, "lines">,
              remove,
            }}
            lines={watchedLines}
            busy={isSubmitting}
          />
        </section>

        <FormSection title={t.notes} icon={NotebookPen} summary={notes?.split("\n")[0] || null}>
          <FormField id="mi-notes" label={t.notes} labelClassName="sr-only" error={errors.notes?.message}>
            <Textarea
              {...fieldAria("mi-notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>
        </FormSection>

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button asChild variant="ghost">
            <Link href={cancelHref}>{d.panel.common.cancel}</Link>
          </Button>
          {canSendEmail ? (
            <>
              <Button type="submit" variant="secondary" disabled={isSubmitting} onClick={() => submitWith(false)}>
                {isSubmitting && !sending ? (
                  <Loader2 className="size-[18px] animate-spin" aria-hidden />
                ) : null}
                {t.issueOnly}
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSendNow} onClick={() => submitWith(true)}>
                {isSubmitting && sending ? (
                  <Loader2 className="size-[18px] animate-spin" aria-hidden />
                ) : (
                  <Send className="size-[18px]" aria-hidden />
                )}
                {t.issueAndSend}
              </Button>
            </>
          ) : (
            <Button type="submit" disabled={isSubmitting} onClick={() => submitWith(false)}>
              {isSubmitting ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
              {t.issue}
            </Button>
          )}
        </div>
      </div>

      {/* Odbiorca: komu pójdzie dokument i mail. */}
      <aside className="order-first flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:sticky lg:top-10 lg:order-none lg:p-6">
        <p className="text-[12.5px] font-medium text-subtle">{t.recipient}</p>
        {tenant ? (
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent"
              aria-hidden
            >
              {initials(tenant.name)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold [overflow-wrap:anywhere] text-fg">{tenant.name}</span>
              <span className={cn("text-[13px] [overflow-wrap:anywhere]", tenant.email ? "text-muted" : "text-warn-ink")}>
                {tenant.email ?? t.noEmail}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">{t.chooseTenant}</p>
        )}
        {lease ? (
          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <span className="text-[12.5px] font-medium text-subtle">{t.lease}</span>
            <span className="text-sm font-[550] text-fg">{lease.label}</span>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
