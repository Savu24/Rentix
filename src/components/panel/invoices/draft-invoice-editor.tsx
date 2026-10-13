"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, NotebookPen, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type UseFieldArrayAppend,
  type UseFormRegister,
} from "react-hook-form";

import { CancelInvoiceDialog, type InvoiceSummary } from "@/components/panel/invoices/invoice-menu";
import { InvoiceLinesFields, type LinesForm } from "@/components/panel/invoices/invoice-lines-fields";
import { FormSection } from "@/components/panel/form-section";
import { PageHeader } from "@/components/panel/page-header";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceKind, VatRate } from "@/generated/prisma/enums";
import { api } from "@/lib/api/client";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { formatAmount } from "@/lib/money";
import {
  invoiceDraftSchema,
  type InvoiceDraftInput,
  type InvoiceDraftOutput,
} from "@/lib/validations/invoice";

export type DraftInvoiceData = {
  id: string;
  kind: InvoiceKind;
  buyerName: string;
  /** Kwota szkicu sformatowana na stronie — do okna usunięcia. */
  amount: string;
  /** Daty w zapisie „2026-10-01" — tak, jak je trzyma pole daty. */
  issueDate: string;
  saleDate: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  /** Czy szkic ma umowę, z której da się go przeliczyć. */
  hasLease: boolean;
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
 * Szkic czynszu za niepełny miesiąc — poprawki i zatwierdzenie
 * (redesign/14-dokument-szkic.svg).
 *
 * Szkic jest od razu formularzem: właściciel poprawia proporcję, dopisuje
 * pozycje (sprzątanie, rozliczenie mediów) albo przesuwa termin i zatwierdza.
 * „Zatwierdź i wystaw" najpierw zapisuje poprawki, potem idzie osobnym
 * żądaniem, bo to ono nadaje numer z rejestru — zapis poprawek numeru nie rusza.
 *
 * „Przelicz z umowy" liczy szkic od nowa, gdy umowę zmieniono już po
 * naliczeniu — patrz `refreshDraftFromLease`.
 *
 * `suggestedNumber` — numer, który nadałby licznik. Podany tylko kontom, które
 * mogą wpisać własny (`renumber.ts`); wtedy obok okresu stoi pole na numer
 * z tym numerem jako podpowiedzią, a wpisany idzie razem z zatwierdzeniem.
 */
export function DraftInvoiceEditor({
  invoice,
  suggestedNumber = null,
  back,
  meta,
  alerts,
}: {
  invoice: DraftInvoiceData;
  suggestedNumber?: string | null;
  back: { href: string; label: string };
  /** Wiersz pod tytułem: nabywca i lokal. */
  meta: string;
  /** Ostrzeżenia strony (niepełne dane wystawcy) — pod nagłówkiem. */
  alerts?: React.ReactNode;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.detail.draft;
  const m = d.panel.financePage.manualInvoice;
  const v = useValidationContext();
  const router = useRouter();

  const [issuing, setIssuing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState<"refresh" | "remove" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState<string | null>(null);

  const defaultValues: InvoiceDraftInput = {
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    periodEnd: invoice.periodEnd ?? "",
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InvoiceDraftInput, unknown, InvoiceDraftOutput>({
    resolver: zodResolver(invoiceDraftSchema(v)),
    // `values`, a nie `defaultValues`: po przeliczeniu z umowy strona przychodzi
    // z nowym szkicem i formularz ma go pokazać, a nie stan sprzed przeliczenia.
    values: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });
  const watchedNotes = useWatch({ control, name: "notes" });

  const busy = isSubmitting || issuing || refreshing;

  const summary: InvoiceSummary = {
    id: invoice.id,
    number: d.panel.invoices.draftNumber,
    amount: invoice.amount,
    buyerName: invoice.buyerName,
  };

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
    setNumberError(null);
    setNotice(null);

    const result = await api.post<{ id: string; number: string }>(
      `/api/invoices/${invoice.id}/issue`,
      number.trim() === "" ? {} : { number },
    );

    setIssuing(false);
    if (!result.ok) {
      // Błąd numeru stoi przy polu numeru, reszta nad formularzem.
      const numberMessage = result.fields?.number?.[0];
      if (numberMessage) setNumberError(numberMessage);
      else setFormError(result.message);
      return;
    }
    router.refresh();
  }

  async function refreshFromLease() {
    setRefreshing(true);
    setFormError(null);
    setNotice(null);

    const result = await api.post<{ id: string }>(`/api/invoices/${invoice.id}/refresh`, {});

    setRefreshing(false);
    setDialog(null);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setNotice(t.refreshed);
    router.refresh();
  }

  async function onSave() {
    if (!(await save())) return;
    setNotice(t.saved);
    router.refresh();
  }

  async function onSaveAndIssue() {
    if (!(await save())) return;
    await issue();
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-6">
        <PageHeader
          back={back}
          title={t.kindTitle[invoice.kind]}
          badges={<InvoiceStatusBadge status="DRAFT" d={d} />}
          meta={<span>{meta}</span>}
          actions={
            <>
              <Button type="button" variant="ghost" onClick={() => setDialog("remove")} disabled={busy}>
                <Trash2 className="size-[18px]" aria-hidden />
                {t.remove}
              </Button>
              {invoice.hasLease ? (
                <Button type="button" variant="secondary" onClick={() => setDialog("refresh")} disabled={busy}>
                  <RefreshCw className="size-[18px]" aria-hidden />
                  {t.refresh}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={handleSubmit(onSaveAndIssue)}
                disabled={busy}
                className="order-first h-12 w-full text-[15px] lg:order-none lg:h-10 lg:w-auto lg:text-sm"
              >
                {issuing ? (
                  <Loader2 className="size-[18px] animate-spin" aria-hidden />
                ) : (
                  <Check className="size-[18px]" aria-hidden />
                )}
                {t.issue}
              </Button>
            </>
          }
        />

        {alerts}
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <div className="flex w-full max-w-[840px] flex-col gap-6">
          <section className="grid grid-cols-1 gap-4 rounded-tile border border-border bg-surface p-5 sm:grid-cols-3 lg:p-7">
            <FormField id="di-periodStart" label={t.periodStart}>
              <DateInput id="di-periodStart" value={invoice.periodStart ?? ""} readOnly disabled />
            </FormField>

            <FormField id="di-periodEnd" label={t.periodEnd} error={errors.periodEnd?.message}>
              <DateInput
                {...fieldAria("di-periodEnd", { error: errors.periodEnd?.message })}
                disabled={busy}
                {...register("periodEnd")}
              />
            </FormField>

            {suggestedNumber !== null ? (
              <FormField id="di-number" label={t.number} error={numberError ?? undefined}>
                <Input
                  {...fieldAria("di-number", { error: numberError ?? undefined })}
                  className="font-mono"
                  value={number}
                  placeholder={suggestedNumber}
                  onChange={(event) => setNumber(event.target.value)}
                  disabled={busy}
                />
              </FormField>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}

            <FormField id="di-issueDate" label={m.issueDate} error={errors.issueDate?.message}>
              <DateInput
                {...fieldAria("di-issueDate", { error: errors.issueDate?.message })}
                disabled={busy}
                {...register("issueDate")}
              />
            </FormField>

            <FormField id="di-saleDate" label={m.saleDate} error={errors.saleDate?.message}>
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
          </section>

          <section className="flex flex-col rounded-tile border border-border bg-surface">
            <h2 className="sr-only">{t.lines}</h2>
            <div className="pt-5 lg:pt-6">
              <InvoiceLinesFields
                idPrefix="di"
                register={register as unknown as UseFormRegister<LinesForm>}
                errors={errors as FieldErrors<LinesForm>}
                fieldArray={{
                  fields,
                  append: append as unknown as UseFieldArrayAppend<LinesForm, "lines">,
                  remove,
                }}
                lines={watchedLines}
                busy={busy}
                defaultVat={invoice.lines[0]?.vatRate ?? "ZW"}
              />
            </div>
          </section>

          <FormSection
            title={m.notes}
            icon={NotebookPen}
            summary={watchedNotes?.split("\n")[0] || null}
            defaultOpen={Boolean(invoice.notes)}
          >
            <FormField id="di-notes" label={m.notes} labelClassName="sr-only" error={errors.notes?.message}>
              <Textarea
                {...fieldAria("di-notes", { error: errors.notes?.message })}
                disabled={busy}
                {...register("notes")}
              />
            </FormField>
          </FormSection>

          {/* Zapis bez wystawiania — dopiero gdy jest co zapisać. */}
          {isDirty ? (
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={busy}>
                {isSubmitting && !issuing ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
                {t.save}
              </Button>
            </div>
          ) : null}
        </div>
      </form>

      <CancelInvoiceDialog
        invoice={summary}
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={t.removeTitle}
        confirmLabel={t.remove}
        numberStays={false}
      />

      <Dialog
        open={dialog === "refresh"}
        onClose={() => setDialog(null)}
        title={t.refreshTitle}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[460px]"
      >
        <DialogBody>
          <p className="text-sm text-muted">{t.refreshConfirm}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialog(null)} disabled={refreshing}>
            {t.refreshKeep}
          </Button>
          <Button onClick={refreshFromLease} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-[18px]" aria-hidden />
            )}
            {t.refresh}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
