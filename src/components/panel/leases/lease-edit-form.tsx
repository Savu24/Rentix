"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
  leaseEditSchema,
  type LeaseEditInput,
  type LeaseEditOutput,
  UTILITIES_MODE_HINT,
  UTILITIES_MODE_INCOMPLETE,
  UTILITIES_MODE_LABEL,
} from "@/lib/validations/lease";

/**
 * Edycja warunków zawartej umowy.
 *
 * Osobny formularz od zakładania, a nie ten sam z przełącznikiem trybu:
 * przy zakładaniu wybiera się lokal, pokój i najemców, a przy poprawce tych
 * pól nie wolno ruszać — przepięcie umowy na inny lokal zostawiłoby poprzedni
 * zajęty i nie zwolniłoby pokoju. Wspólny formularz musiałby je wyłączać
 * warunkowo w kilkunastu miejscach i pierwsza pomyłka w tych warunkach
 * kosztowałaby rozjechany stan zajętości.
 */
export function LeaseEditForm({
  leaseId,
  defaultValues,
}: {
  leaseId: string;
  defaultValues: LeaseEditInput;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeaseEditInput, unknown, LeaseEditOutput>({
    resolver: zodResolver(leaseEditSchema),
    defaultValues,
  });

  const utilitiesMode = watch("utilitiesMode");
  const chargesAdvance = utilitiesMode === "FLAT_RATE" || utilitiesMode === "MIXED";

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);

    const result = await api.patch(`/api/leases/${leaseId}`, getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof LeaseEditInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    router.push(`/panel/umowy/${leaseId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Okres</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="startDate" label="Data rozpoczęcia" error={errors.startDate?.message}>
              <DateInput
                {...fieldAria("startDate", { error: errors.startDate?.message })}
                disabled={isSubmitting}
                {...register("startDate")}
              />
            </FormField>

            <FormField
              id="endDate"
              label="Data zakończenia"
              error={errors.endDate?.message}
              hint="Puste = czas nieokreślony."
            >
              <DateInput
                {...fieldAria("endDate", { error: errors.endDate?.message })}
                disabled={isSubmitting}
                {...register("endDate")}
              />
            </FormField>

            <FormField
              id="number"
              label="Numer umowy"
              error={errors.number?.message}
              hint="Opcjonalny."
            >
              <Input
                {...fieldAria("number", { error: errors.number?.message })}
                disabled={isSubmitting}
                {...register("number")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Czynsz i rozliczenia</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rentGrosze" label="Czynsz miesięczny" error={errors.rentGrosze?.message}>
              <Input
                {...fieldAria("rentGrosze", { error: errors.rentGrosze?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("rentGrosze")}
              />
            </FormField>

            <FormField
              id="depositGrosze"
              label="Kaucja"
              error={errors.depositGrosze?.message}
              hint="Zmiana nie przelicza wystawionych już rozliczeń."
            >
              <Input
                {...fieldAria("depositGrosze", { error: errors.depositGrosze?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("depositGrosze")}
              />
            </FormField>

            <FormField
              id="utilitiesMode"
              label="Rozliczenie mediów"
              error={errors.utilitiesMode?.message}
              hint={UTILITIES_MODE_HINT[utilitiesMode ?? "FLAT_RATE"]}
            >
              <Select
                {...fieldAria("utilitiesMode", { error: errors.utilitiesMode?.message })}
                disabled={isSubmitting}
                {...register("utilitiesMode")}
              >
                {Object.entries(UTILITIES_MODE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            {utilitiesMode && UTILITIES_MODE_INCOMPLETE[utilitiesMode] ? (
              <div className="sm:col-span-2">
                <Alert tone="warning">{UTILITIES_MODE_INCOMPLETE[utilitiesMode]}</Alert>
              </div>
            ) : null}

            {chargesAdvance ? (
              <FormField
                id="utilitiesAdvanceGrosze"
                label="Zaliczka na media"
                error={errors.utilitiesAdvanceGrosze?.message}
              >
                <Input
                  {...fieldAria("utilitiesAdvanceGrosze", {
                    error: errors.utilitiesAdvanceGrosze?.message,
                  })}
                  inputMode="decimal"
                  disabled={isSubmitting}
                  {...register("utilitiesAdvanceGrosze")}
                />
              </FormField>
            ) : null}

            <FormField
              id="billingDay"
              label="Dzień naliczania"
              error={errors.billingDay?.message}
              hint="1–28, żeby luty nie wymagał wyjątku."
            >
              <Input
                {...fieldAria("billingDay", { error: errors.billingDay?.message })}
                type="number"
                min={1}
                max={28}
                disabled={isSubmitting}
                {...register("billingDay")}
              />
            </FormField>

            <FormField
              id="paymentTermDays"
              label="Termin płatności (dni)"
              error={errors.paymentTermDays?.message}
            >
              <Input
                {...fieldAria("paymentTermDays", { error: errors.paymentTermDays?.message })}
                type="number"
                min={0}
                max={90}
                disabled={isSubmitting}
                {...register("paymentTermDays")}
              />
            </FormField>

            <FormField
              id="billingStartsAt"
              label="Nie naliczaj przed"
              error={errors.billingStartsAt?.message}
              hint="Miesiące rozliczone w poprzednim programie. Puste = od początku umowy."
            >
              <DateInput
                {...fieldAria("billingStartsAt", { error: errors.billingStartsAt?.message })}
                disabled={isSubmitting}
                {...register("billingStartsAt")}
              />
            </FormField>
          </div>

          <CheckboxField
            label="Wysyłaj rachunki mailem"
            hint="Wyłącz, jeśli ten najemca ma dostawać dokumenty poza systemem. Ręczna wysyłka z widoku rachunku pozostaje dostępna."
            disabled={isSubmitting}
            {...register("sendInvoicesByEmail")}
          />

          <FormField id="notes" label="Ustalenia dodatkowe" error={errors.notes?.message}>
            <Textarea
              {...fieldAria("notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Zmiana warunków nie rusza wystawionych dokumentów — właściciel musi
          to wiedzieć zanim zapisze, a nie dowiedzieć się z niezgodnej faktury. */}
      <Alert tone="info">
        Nowe warunki wejdą do rozliczeń naliczanych od teraz. Dokumenty już wystawione zostają
        takie, jakie są — popraw je pojedynczo, jeśli mają się zmienić.
      </Alert>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Zapisywanie…
            </>
          ) : (
            "Zapisz zmiany"
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push(`/panel/umowy/${leaseId}`)}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}
