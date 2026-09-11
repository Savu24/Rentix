"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { InvoiceKind } from "@/generated/prisma/enums";
import { api } from "@/lib/api/client";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import {
  DEFAULT_NUMBER_FORMAT,
  NUMBER_FORMAT_PRESETS,
  isNumberFormatPreset,
  numberFormatProblem,
  numberingPeriod,
  renderNumberFormat,
} from "@/lib/invoices/number-format";
import { numberingSettingsSchema } from "@/lib/validations/settings";
import { invoiceKindLabels, selectableInvoiceKinds } from "@/lib/validations/invoice";

/**
 * Wzór numeru dokumentu.
 *
 * Lista gotowych wzorów plus pole na własny. Pod spodem podgląd, jak wyjdzie
 * następny dokument każdego rodzaju — bo „{y}/{m}/{n}" mówi coś programiście,
 * a „2026/09/3" mówi coś księgowej. Litery serii przychodzą z serwera:
 * siedzą w części słownika, która nie trafia do przeglądarki.
 */
export function NumberingForm({
  current,
  prefixes,
}: {
  /** Wzór zapisany w bazie; NULL = domyślny. */
  current: string | null;
  prefixes: Record<InvoiceKind, string>;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.settings.numbering;
  const v = useValidationContext();
  const router = useRouter();

  const stored = current ?? DEFAULT_NUMBER_FORMAT;
  const [choice, setChoice] = useState<string>(isNumberFormatPreset(stored) ? stored : "custom");
  const [custom, setCustom] = useState(isNumberFormatPreset(stored) ? "" : stored);
  const [customError, setCustomError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const template = choice === "custom" ? custom.trim() : choice;
  const kinds = selectableInvoiceKinds(locale);
  const kindLabels = invoiceKindLabels(d);

  // Dzisiejsza data po lokalnym czasie, przepisana na UTC — renderer czyta
  // datę po UTC, bo tak są zapisane daty wystawienia w bazie.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const previewable = template !== "" && numberFormatProblem(template) === null;

  function example(kind: InvoiceKind): string {
    const core = renderNumberFormat(template, 3, today);
    const prefix = prefixes[kind];
    return prefix === "" ? core : `${prefix} ${core}`;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCustomError(null);
    setSaved(false);

    // Ta sama walidacja co na serwerze — błąd pokazuje się przy polu, zanim
    // żądanie wyjdzie, a serwer i tak sprawdzi drugi raz.
    const parsed = numberingSettingsSchema(v).safeParse({ invoiceNumberFormat: template });
    if (!parsed.success) {
      setCustomError(parsed.error.issues[0]?.message ?? null);
      return;
    }

    setSubmitting(true);
    const result = await api.patch("/api/organization/numbering", {
      invoiceNumberFormat: template,
    });
    setSubmitting(false);

    if (!result.ok) {
      setCustomError(result.fields?.invoiceNumberFormat?.[0] ?? null);
      setFormError(result.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{t.lead}</p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{t.saved}</Alert> : null}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2.5" disabled={submitting}>
            <legend className="sr-only">{t.title}</legend>

            {NUMBER_FORMAT_PRESETS.map((preset) => (
              <FormatOption
                key={preset}
                name="numbering"
                value={preset}
                checked={choice === preset}
                onChange={() => setChoice(preset)}
                label={t.presets[preset]}
                hint={renderNumberFormat(preset, 3, today)}
              />
            ))}

            <FormatOption
              name="numbering"
              value="custom"
              checked={choice === "custom"}
              onChange={() => setChoice("custom")}
              label={t.custom}
            />
          </fieldset>

          {choice === "custom" ? (
            <FormField
              id="numbering-custom"
              label={t.customLabel}
              error={customError ?? undefined}
              hint={t.customHint}
            >
              <Input
                {...fieldAria("numbering-custom", { error: customError ?? undefined })}
                value={custom}
                onChange={(event) => {
                  setCustom(event.target.value);
                  setCustomError(null);
                }}
                placeholder="{m}/{y}/A/{n}"
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
                className="font-mono"
              />
            </FormField>
          ) : null}

          {previewable ? (
            <div className="rounded-control border border-border bg-surface-alt px-3.5 py-3 text-sm">
              <p className="text-xs font-medium text-muted">{t.preview}</p>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {kinds.map((kind) => (
                  <div key={kind} className="contents">
                    <dt className="text-muted">{kindLabels[kind]}</dt>
                    <dd className="font-mono text-fg">{example(kind)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted">{t.period[numberingPeriod(template)]}</p>
            </div>
          ) : null}

          <div>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : saved ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
              {t.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Jedna pozycja listy — natywne radio z tego samego powodu, co checkbox
 * w `checkbox-field.tsx`: klawiatura i czytnik ekranu działają bez ARIA.
 */
function FormatOption({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  const id = `${name}-${value}`;

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <label htmlFor={id} className="flex cursor-pointer select-none flex-wrap items-baseline gap-x-3">
        <span className="text-[13px] font-medium text-fg">{label}</span>
        {hint ? <span className="font-mono text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}
