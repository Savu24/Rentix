"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_ORDER,
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
};

/**
 * Dopisanie kosztu.
 *
 * Formularz rozwija się na miejscu zamiast prowadzić na osobną stronę: koszty
 * wpisuje się seriami z wyciągu bankowego, a nawigacja tam i z powrotem po
 * każdej pozycji kosztowałaby więcej czasu niż samo wpisywanie.
 */
export function ExpenseForm({ properties }: { properties: ExpensePropertyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: { ...EMPTY, paidAt: new Date().toISOString().slice(0, 10) },
  });

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);

    const result = await api.post("/api/expenses", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof ExpenseFormInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    // Data i kategoria zostają — kolejna pozycja z wyciągu jest zwykle z tego
    // samego dnia i tej samej kategorii.
    reset({
      ...EMPTY,
      paidAt: getValues("paidAt"),
      category: getValues("category"),
      propertyId: getValues("propertyId"),
    });
    router.refresh();
  }

  if (!open) {
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
        <p className="text-sm font-semibold text-fg">Nowy koszt</p>

        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="expense-category" label="Kategoria" error={errors.category?.message}>
              <Select
                {...fieldAria("expense-category", { error: errors.category?.message })}
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

            <FormField id="expense-amount" label="Kwota" error={errors.amountGrosze?.message}>
              <Input
                {...fieldAria("expense-amount", { error: errors.amountGrosze?.message })}
                inputMode="decimal"
                placeholder="450,00"
                disabled={isSubmitting}
                {...register("amountGrosze")}
              />
            </FormField>

            <FormField
              id="expense-paidAt"
              label="Data poniesienia"
              error={errors.paidAt?.message}
            >
              <Input
                {...fieldAria("expense-paidAt", { error: errors.paidAt?.message })}
                type="date"
                disabled={isSubmitting}
                {...register("paidAt")}
              />
            </FormField>
          </div>

          <FormField
            id="expense-description"
            label="Opis"
            error={errors.description?.message}
            hint="Co to był za wydatek — trafi na zestawienie."
          >
            <Input
              {...fieldAria("expense-description", { error: errors.description?.message })}
              placeholder="Czynsz do wspólnoty za sierpień"
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="expense-propertyId"
              label="Nieruchomość"
              error={errors.propertyId?.message}
              hint="Puste = koszt ogólny konta."
            >
              <Select
                {...fieldAria("expense-propertyId", { error: errors.propertyId?.message })}
                disabled={isSubmitting}
                {...register("propertyId")}
              >
                <option value="">— koszt ogólny —</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="expense-vendor" label="Dostawca" error={errors.vendor?.message}>
              <Input
                {...fieldAria("expense-vendor", { error: errors.vendor?.message })}
                placeholder="Wspólnota Długa 14"
                disabled={isSubmitting}
                {...register("vendor")}
              />
            </FormField>

            <FormField
              id="expense-documentRef"
              label="Nr dokumentu"
              error={errors.documentRef?.message}
            >
              <Input
                {...fieldAria("expense-documentRef", { error: errors.documentRef?.message })}
                placeholder="FV 12/2026"
                disabled={isSubmitting}
                {...register("documentRef")}
              />
            </FormField>
          </div>

          <FormField id="expense-notes" label="Notatka" error={errors.notes?.message}>
            <Textarea
              {...fieldAria("expense-notes", { error: errors.notes?.message })}
              placeholder="Opcjonalne."
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz koszt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Zamknij
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
