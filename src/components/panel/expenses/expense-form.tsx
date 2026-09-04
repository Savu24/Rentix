"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_ORDER,
  EXPENSE_RECURRENCE_LABEL,
  EXPENSE_RECURRENCE_ORDER,
  expenseFormSchema,
  type ExpenseFormInput,
  type ExpenseFormOutput,
} from "@/lib/validations/expense";

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
}: {
  properties?: ExpensePropertyOption[];
  lockedPropertyId?: string | null;
  expenseId?: string;
  defaultValues?: Partial<ExpenseFormInput>;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(expenseId);
  // Edycja startuje rozwinięta: właściciel kliknął już ołówek przy wierszu,
  // drugi klik na „pokaż formularz" nie wnosiłby nic.
  const [open, setOpen] = useState(isEdit);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
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
    router.refresh();
  }

  if (!open && !isEdit) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Dodaj koszt
      </Button>
    );
  }

  /*
    `w-full` po rozwinięciu.

    Przycisk stoi w wierszu nagłówka, obok tytułu strony, i tam jest na miejscu.
    Rozwinięty formularz dziedziczył to samo miejsce, czyli wąską prawą kolumnę
    obok nagłówka — a ma osiem pól. Pełna szerokość wypycha go do własnego
    wiersza (rodzic ma `flex-wrap`), więc korzysta z całej szerokości strony,
    tak jak formularz najemcy na osobnej stronie.
  */
  return (
    <Card className="w-full border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <p className="text-sm font-semibold text-fg">{isEdit ? "Edycja kosztu" : "Nowy koszt"}</p>

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={fieldId("category")} label="Kategoria" error={errors.category?.message}>
              <Select
                {...fieldAria(fieldId("category"), { error: errors.category?.message })}
                disabled={isSubmitting}
                {...register("category")}
              >
                {EXPENSE_CATEGORY_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {EXPENSE_CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id={fieldId("amount")} label="Kwota" error={errors.amountGrosze?.message}>
              <Input
                {...fieldAria(fieldId("amount"), { error: errors.amountGrosze?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("amountGrosze")}
              />
            </FormField>

            <FormField
              id={fieldId("paidAt")}
              label="Data poniesienia"
              error={errors.paidAt?.message}
            >
              <DateInput
                {...fieldAria(fieldId("paidAt"), { error: errors.paidAt?.message })}
                disabled={isSubmitting}
                {...register("paidAt")}
              />
            </FormField>
          </div>

          <FormField
            id={fieldId("description")}
            label="Opis"
            error={errors.description?.message}
            hint="Co to był za wydatek. Trafi na zestawienie."
          >
            <Input
              {...fieldAria(fieldId("description"), { error: errors.description?.message })}
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <div className={`grid gap-4 ${lockedPropertyId ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {lockedPropertyId ? (
              // Pole i tak jedzie w żądaniu — ukryte, żeby nie dało się tu przypiąć
              // kosztu do innej nieruchomości niż ta otwarta na ekranie.
              <input type="hidden" {...register("propertyId")} />
            ) : (
              <FormField
                id={fieldId("propertyId")}
                label="Nieruchomość"
                error={errors.propertyId?.message}
                hint="Puste = koszt ogólny konta."
              >
                <Select
                  {...fieldAria(fieldId("propertyId"), { error: errors.propertyId?.message })}
                  disabled={isSubmitting}
                  {...register("propertyId")}
                >
                  <option value="">Koszt ogólny</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            <FormField id={fieldId("vendor")} label="Dostawca" error={errors.vendor?.message}>
              <Input
                {...fieldAria(fieldId("vendor"), { error: errors.vendor?.message })}
                disabled={isSubmitting}
                {...register("vendor")}
              />
            </FormField>

            <FormField
              id={fieldId("documentRef")}
              label="Nr dokumentu"
              error={errors.documentRef?.message}
            >
              <Input
                {...fieldAria(fieldId("documentRef"), { error: errors.documentRef?.message })}
                disabled={isSubmitting}
                {...register("documentRef")}
              />
            </FormField>
          </div>

          {/* Cykliczność pod polami samej pozycji: najpierw „ile i za co”, dopiero
              potem „czy to wraca”. Pola cyklu pojawiają się po zaznaczeniu, bo dla
              większości kosztów odpowiedź brzmi „nie”. */}
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-alt p-3.5">
            <CheckboxField
              label="Koszt cykliczny"
              hint="Rentix sam dopisze kolejne pozycje, gdy minie ich termin."
              disabled={isSubmitting}
              {...register("recurring")}
            />

            {recurring ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id={fieldId("recurrence")}
                  label="Co ile ponosisz ten koszt"
                  error={errors.recurrence?.message}
                >
                  <Select
                    {...fieldAria(fieldId("recurrence"), { error: errors.recurrence?.message })}
                    disabled={isSubmitting}
                    {...register("recurrence")}
                  >
                    {EXPENSE_RECURRENCE_ORDER.map((value) => (
                      <option key={value} value={value}>
                        {EXPENSE_RECURRENCE_LABEL[value]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {recurrence === "CUSTOM" ? (
                  <FormField
                    id={fieldId("recurrenceEveryDays")}
                    label="Co ile dni"
                    error={errors.recurrenceEveryDays?.message}
                    hint="Np. 90 przy przeglądzie kwartalnym."
                  >
                    <Input
                      {...fieldAria(fieldId("recurrenceEveryDays"), {
                        error: errors.recurrenceEveryDays?.message,
                      })}
                      inputMode="numeric"
                      disabled={isSubmitting}
                      {...register("recurrenceEveryDays")}
                    />
                  </FormField>
                ) : null}
              </div>
            ) : null}
          </div>

          <FormField id={fieldId("notes")} label="Notatka" error={errors.notes?.message}>
            <Textarea
              {...fieldAria(fieldId("notes"), { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isEdit ? "Zapisz zmiany" : "Zapisz koszt"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
              disabled={isSubmitting}
            >
              {isEdit ? "Anuluj" : "Zamknij"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
