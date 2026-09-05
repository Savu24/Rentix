"use client";

import { Check, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { EMPTY_OWNER, OwnerFields } from "@/components/panel/owners/owner-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { ownerFormSchema, type OwnerFormInput } from "@/lib/validations/owner";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
export type OwnerOption = { id: string; name: string; city: string | null };

/**
 * Wybór właściciela przy nieruchomości, z możliwością dodania go na miejscu.
 *
 * Formularz rozwija się w tej samej karcie zamiast prowadzić na osobną stronę:
 * właściciela wpisuje się raz, w trakcie dodawania mieszkania, a odesłanie
 * gdzie indziej kasowałoby to, co użytkownik zdążył już wpisać w kreatorze.
 *
 * Nie jest to zagnieżdżony `<form>` — pola siedzą w `<div>`, a zapis wywołuje
 * przycisk. Zagnieżdżony formularz jest niepoprawnym HTML-em i przeglądarka
 * potrafi wtedy wysłać zewnętrzny formularz przy Enterze w polu wewnętrznym.
 */
export function OwnerPicker({
  owners,
  value,
  onChange,
  disabled,
}: {
  owners: OwnerOption[];
  value: string;
  onChange: (ownerId: string) => void;
  disabled?: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.ownersPage.picker;
  const v = useValidationContext();
  const [options, setOptions] = useState(owners);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    getValues,
    trigger,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<OwnerFormInput>({
    resolver: zodResolver(ownerFormSchema(v)),
    defaultValues: EMPTY_OWNER,
  });

  async function save() {
    setError(null);

    // Walidację odpalamy ręcznie: to nie jest `<form>`, więc nie ma zdarzenia
    // submit, które zrobiłoby to samo.
    if (!(await trigger())) return;

    setBusy(true);
    const result = await api.post<{ id: string; name: string }>("/api/owners", getValues());
    setBusy(false);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field in EMPTY_OWNER && messages[0]) {
          setFieldError(field as keyof OwnerFormInput, { message: messages[0] });
        }
      }
      setError(result.message);
      return;
    }

    // Nowy właściciel od razu ląduje na liście i zostaje wybrany — inaczej
    // trzeba by odświeżyć stronę, tracąc resztę wypełnionego kreatora.
    setOptions((current) =>
      [...current, { id: result.data.id, name: result.data.name, city: null }].sort((a, b) =>
        a.name.localeCompare(b.name, "pl"),
      ),
    );
    onChange(result.data.id);
    reset(EMPTY_OWNER);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField
        id="ownerId"
        label={t.label}
        hint={t.hint}
      >
        <Select
          id="ownerId"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || adding}
        >
          <option value="">{t.own}</option>
          {options.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
              {owner.city ? ` · ${owner.city}` : ""}
            </option>
          ))}
        </Select>
      </FormField>

      {!adding ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setAdding(true)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {d.panel.ownersPage.add}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-control border border-accent/40 bg-surface-alt p-4">
          <div>
            <p className="text-sm font-semibold text-fg">{t.addNew}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t.addNewHint}
            </p>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <OwnerFields
            register={register}
            errors={errors}
            disabled={busy}
            idPrefix="new-owner"
          />

          <div className="flex flex-wrap gap-2.5">
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {d.panel.panelMisc.saveOwner}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setError(null);
                reset(EMPTY_OWNER);
              }}
              disabled={busy}
            >
              <X className="h-4 w-4" aria-hidden />
              {d.panel.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
