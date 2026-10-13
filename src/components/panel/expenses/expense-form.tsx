"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, Loader2, Plus, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { formatMoneyParts } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  expenseCategoryLabels,
  EXPENSE_CATEGORY_ORDER,
  expenseRecurrenceLabels,
  EXPENSE_RECURRENCE_ORDER,
  expenseFormSchema,
  type ExpenseFormInput,
  type ExpenseFormOutput,
} from "@/lib/validations/expense";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
export type ExpensePropertyOption = { id: string; name: string };

const EMPTY: ExpenseFormInput = {
  propertyId: "",
  category: "COMMUNITY_FEE",
  amountGrosze: "",
  paidAt: "",
  description: "",
  vendor: "",
  documentRef: "",
  notes: "",
  recurring: false,
  recurrence: "MONTHLY",
  recurrenceEveryDays: "",
};

/**
 * Dopisanie kosztu — i poprawienie już wpisanego.
 *
 * Formularz rozwija się na miejscu zamiast prowadzić na osobną stronę: koszty
 * wpisuje się seriami z wyciągu bankowego, a nawigacja tam i z powrotem po
 * każdej pozycji kosztowałaby więcej czasu niż samo wpisywanie. Edycja działa
 * tak samo — wchodzi w miejsce wiersza, bo poprawia się zwykle jedną literówkę
 * w kwocie, a nie cały wpis.
 */
export function ExpenseForm({
  properties = [],
  /**
   * Nieruchomość narzucona przez kontekst — formularz na karcie nieruchomości.
   * Wtedy nie pytamy, do czego przypisać koszt: odpowiedź stoi w adresie,
   * więc lista pozostałych nieruchomości jest tam zbędna.
   */
  lockedPropertyId = null,
  /** Podany = edycja istniejącego kosztu, a nie dopisanie nowego. */
  expenseId,
  defaultValues,
  /** Wyjście z edycji — wiersz wraca na swoje miejsce. */
  onClose,
  /** Wygląd przycisku „Dodaj koszt" — na karcie nieruchomości drugorzędny. */
  triggerVariant = "primary",
}: {
  properties?: ExpensePropertyOption[];
  lockedPropertyId?: string | null;
  expenseId?: string;
  defaultValues?: Partial<ExpenseFormInput>;
  onClose?: () => void;
  triggerVariant?: "primary" | "secondary";
}) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.expenseForm;
  const v = useValidationContext();
  const router = useRouter();
  const isEdit = Boolean(expenseId);
  // Edycja startuje rozwinięta: właściciel kliknął już ołówek przy wierszu,
  // drugi klik na „pokaż formularz" nie wnosiłby nic.
  const [open, setOpen] = useState(isEdit);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { currency } = formatMoneyParts(0, locale);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema(v)),
    defaultValues: {
      ...EMPTY,
      propertyId: lockedPropertyId ?? "",
      paidAt: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  });

  /*
    Prefiks w identyfikatorach pól.

    Formularz edycji stoi w tym samym drzewie co formularz dopisywania — przy
    stałych `id` obie kontrolki „Kwota" miałyby ten sam identyfikator, a
    kliknięcie etykiety ustawiałoby kursor w cudzym polu.
  */
  const fieldId = (name: string) => `expense-${expenseId ?? "new"}-${name}`;

  const recurring = watch("recurring");
  const recurrence = watch("recurrence");

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);

    const result = isEdit
      ? await api.patch(`/api/expenses/${expenseId}`, getValues())
      : await api.post("/api/expenses", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof ExpenseFormInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    // Po edycji formularz znika, więc nie ma czego czyścić — wiersz wraca
    // z odświeżonymi danymi.
    if (isEdit) {
      onClose?.();
      router.refresh();
      return;
    }

    // Cykliczność wraca do wyłączonej, choć data i kategoria zostają: drugi
    // wzorzec zapisany przez pomyłkę naliczałby ten sam koszt podwójnie,
    // a zauważyłoby się to dopiero po miesiącu.
    reset({
      ...EMPTY,
      paidAt: getValues("paidAt"),
      category: getValues("category"),
      propertyId: getValues("propertyId"),
    });
    setOpen(false);
    router.refresh();
  }

  function close() {
    setOpen(false);
    setFormError(null);
    onClose?.();
  }

  // Szczegóły zwinięte, chyba że coś w nich jest albo walidacja wskazała błąd.
  const detailsFilled = Boolean(
    defaultValues?.vendor || defaultValues?.documentRef || defaultValues?.notes,
  );
  const detailsError = Boolean(errors.vendor || errors.documentRef || errors.notes);
  const showDetails = detailsOpen || detailsFilled || detailsError;

  return (
    <>
      {isEdit ? null : (
        <Button
          size={triggerVariant === "primary" ? "md" : "sm"}
          variant={triggerVariant}
          onClick={() => setOpen(true)}
        >
          <Plus className={triggerVariant === "primary" ? "size-[18px]" : "size-4"} aria-hidden />
          {t.add}
        </Button>
      )}

      <Dialog open={open} onClose={close} title={isEdit ? t.editTitle : t.newTitle} closeLabel={t.close}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            {formError ? <Alert tone="error">{formError}</Alert> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id={fieldId("category")} label={t.category} error={errors.category?.message}>
                <Select
                  {...fieldAria(fieldId("category"), { error: errors.category?.message })}
                  disabled={isSubmitting}
                  {...register("category")}
                >
                  {EXPENSE_CATEGORY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {expenseCategoryLabels(d)[value]}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField id={fieldId("amount")} label={t.amount} error={errors.amountGrosze?.message}>
                <div className="relative">
                  <Input
                    {...fieldAria(fieldId("amount"), { error: errors.amountGrosze?.message })}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="pr-10 font-mono"
                    disabled={isSubmitting}
                    {...register("amountGrosze")}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
                    {currency}
                  </span>
                </div>
              </FormField>

              <FormField id={fieldId("paidAt")} label={t.paidAt} error={errors.paidAt?.message}>
                <DateInput
                  {...fieldAria(fieldId("paidAt"), { error: errors.paidAt?.message })}
                  disabled={isSubmitting}
                  {...register("paidAt")}
                />
              </FormField>

              {lockedPropertyId ? (
                <input type="hidden" {...register("propertyId")} />
              ) : (
                <FormField id={fieldId("propertyId")} label={t.property} error={errors.propertyId?.message}>
                  <Select
                    {...fieldAria(fieldId("propertyId"), { error: errors.propertyId?.message })}
                    disabled={isSubmitting}
                    {...register("propertyId")}
                  >
                    <option value="">{t.generalCost}</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </div>

            <FormField id={fieldId("description")} label={t.description} error={errors.description?.message}>
              <Input
                {...fieldAria(fieldId("description"), { error: errors.description?.message })}
                disabled={isSubmitting}
                {...register("description")}
              />
            </FormField>

            {/* Cykliczność: przełącznik, a pod nim co ile. Dla większości
                kosztów odpowiedź brzmi „nie", więc wybór cyklu jest ukryty. */}
            <div className="flex flex-col gap-4 rounded-xl bg-surface-alt p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[14.5px] font-semibold text-fg">
                  <Repeat className="size-[18px] text-muted" aria-hidden />
                  {t.recurring}
                </span>
                <Switch
                  checked={Boolean(recurring)}
                  onCheckedChange={(next) => setValue("recurring", next, { shouldDirty: true })}
                  disabled={isSubmitting}
                  label={t.recurring}
                />
              </div>

              {recurring ? (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="sr-only">{t.recurrence}</legend>
                    <div className="flex flex-wrap gap-1 rounded-control bg-surface p-1 shadow-btn">
                      {EXPENSE_RECURRENCE_ORDER.map((value) => (
                        <label
                          key={value}
                          className={cn(
                            "flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-3 text-[13.5px] whitespace-nowrap transition-colors",
                            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent",
                            recurrence === value
                              ? "bg-accent-soft font-semibold text-accent"
                              : "font-medium text-muted hover:text-fg",
                          )}
                        >
                          <input
                            type="radio"
                            value={value}
                            className="sr-only"
                            disabled={isSubmitting}
                            {...register("recurrence")}
                          />
                          {expenseRecurrenceLabels(d)[value]}
                        </label>
                      ))}
                    </div>
                    {errors.recurrence?.message ? (
                      <p className="text-[13px] text-bad">{errors.recurrence.message}</p>
                    ) : null}
                  </fieldset>

                  {recurrence === "CUSTOM" ? (
                    <FormField
                      id={fieldId("recurrenceEveryDays")}
                      label={t.everyDays}
                      error={errors.recurrenceEveryDays?.message}
                    >
                      <Input
                        {...fieldAria(fieldId("recurrenceEveryDays"), {
                          error: errors.recurrenceEveryDays?.message,
                        })}
                        inputMode="numeric"
                        className="font-mono sm:w-40"
                        disabled={isSubmitting}
                        {...register("recurrenceEveryDays")}
                      />
                    </FormField>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                aria-expanded={showDetails}
                className="flex items-center gap-1.5 self-start rounded-btn text-[13.5px] font-[550] text-accent"
              >
                <ChevronDown
                  className={cn("size-4 transition-transform motion-reduce:transition-none", showDetails && "rotate-180")}
                  strokeWidth={2}
                  aria-hidden
                />
                {t.moreDetails}
              </button>

              {showDetails ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField id={fieldId("vendor")} label={t.vendor} error={errors.vendor?.message}>
                      <Input
                        {...fieldAria(fieldId("vendor"), { error: errors.vendor?.message })}
                        disabled={isSubmitting}
                        {...register("vendor")}
                      />
                    </FormField>

                    <FormField id={fieldId("documentRef")} label={t.documentRef} error={errors.documentRef?.message}>
                      <Input
                        {...fieldAria(fieldId("documentRef"), { error: errors.documentRef?.message })}
                        className="font-mono"
                        disabled={isSubmitting}
                        {...register("documentRef")}
                      />
                    </FormField>
                  </div>

                  <FormField id={fieldId("notes")} label={t.notes} error={errors.notes?.message}>
                    <Textarea
                      {...fieldAria(fieldId("notes"), { error: errors.notes?.message })}
                      disabled={isSubmitting}
                      {...register("notes")}
                    />
                  </FormField>
                </>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={isSubmitting}>
              {d.panel.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <Check className="size-[18px]" aria-hidden />
              )}
              {isEdit ? d.panel.common.saveChanges : t.save}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
