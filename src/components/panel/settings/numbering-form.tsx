"use client";

import { Check, Hash, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { InfoTip } from "@/components/ui/info-tip";
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
import { cn } from "@/lib/utils";

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

  function example(kind: InvoiceKind, format: string = template): string {
    const core = renderNumberFormat(format, 3, today);
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
    <SectionCard
      title={t.title}
      icon={Hash}
      actions={
        <InfoTip label={t.customInfo} align="end">
          {t.customHint}
        </InfoTip>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{t.saved}</Alert> : null}

        <fieldset className="flex flex-col gap-2" disabled={submitting}>
          <legend className="sr-only">{t.title}</legend>

          {NUMBER_FORMAT_PRESETS.map((preset) => (
            <FormatOption
              key={preset}
              name="numbering"
              value={preset}
              checked={choice === preset}
              onChange={() => setChoice(preset)}
              label={preset}
              description={t.presets[preset]}
              example={example(kinds[0]!, preset)}
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
          <FormField id="numbering-custom" label={t.customLabel} error={customError ?? undefined}>
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

        <div className="flex flex-wrap items-end justify-between gap-4">
          {previewable ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 text-sm">
                {kinds.map((kind, index) => (
                  <div key={kind} className="contents">
                    <dt className="text-[13px] text-muted">{index === 0 ? t.preview : kindLabels[kind]}</dt>
                    <dd className={cn("font-mono", index === 0 ? "font-[650] text-fg" : "text-muted")}>
                      {example(kind)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-[12.5px] text-subtle">{t.period[numberingPeriod(template)]}</p>
            </div>
          ) : (
            <span />
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : saved ? (
              <Check className="size-[18px]" aria-hidden />
            ) : null}
            {t.save}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/**
 * Jedna pozycja listy jako karta wyboru (redesign: `radio` w obramowaniu).
 * Natywne radio z tego samego powodu, co checkbox w `checkbox-field.tsx`:
 * klawiatura i czytnik ekranu działają bez ARIA, a cała karta jest etykietą.
 */
function FormatOption({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  example,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  example?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-alert border px-4 py-2.5 transition-colors select-none",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        checked ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border-strong bg-surface hover:bg-hover",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-[18px] shrink-0 cursor-pointer accent-[var(--primary)]"
      />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className={cn("text-sm font-[550] text-fg", value !== "custom" && "font-mono")}>{label}</span>
        {description ? <span className="text-[12.5px] text-muted">{description}</span> : null}
      </span>
      {example ? (
        <span className={cn("shrink-0 font-mono text-sm whitespace-nowrap", checked ? "font-semibold text-accent" : "text-muted")}>
          {example}
        </span>
      ) : null}
    </label>
  );
}
