"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { signOutAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { accountDeletePhrase } from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
export type DeletionSummary = {
  organizationName: string;
  isLastMember: boolean;
  properties: number;
  tenants: number;
  leases: number;
  invoices: number;
  payments: number;
  expenses: number;
};

/**
 * Usunięcie konta.
 *
 * Sekcja jest domyślnie zwinięta i stoi na końcu ustawień — nie dlatego, że
 * jest wstydliwa, tylko żeby nie sąsiadowała z „Zapisz" w formularzu obok.
 *
 * Przed potwierdzeniem pokazujemy, co dokładnie zniknie, z liczbami. Ogólne
 * „stracisz swoje dane" nikogo nie zatrzymuje; „29 dokumentów rozliczeniowych"
 * zatrzymuje.
 */
export function DeleteAccount({ summary }: { summary: DeletionSummary }) {
  const { d, plural } = useI18n();
  const t = d.panel.panelMisc.deleteAccount;
  const misc = d.panel.panelMisc;
  const v = useValidationContext();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const nouns = misc.deleteAccountItems;
  const items: Array<[number, readonly string[]]> = [
    [summary.properties, nouns.properties],
    [summary.tenants, nouns.tenants],
    [summary.leases, nouns.leases],
    [summary.invoices, nouns.invoices],
    [summary.payments, nouns.payments],
    [summary.expenses, nouns.expenses],
  ];

  const losses = items
    .filter(([count]) => count > 0)
    .map(([count, forms]) => `${count} ${plural(count, forms)}`);

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await api.delete("/api/me", {
      currentPassword: password,
      confirmation,
    });

    if (!result.ok) {
      setBusy(false);
      setError(result.fields?.currentPassword?.[0] ?? result.fields?.confirmation?.[0] ?? result.message);
      return;
    }

    // Konta już nie ma, więc sesja wskazuje w pustkę — wylogowanie czyści
    // ciasteczko i odsyła na stronę główną.
    await signOutAction();
  }

  return (
    <Card className="border-bad/40">
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {t.lead}
          </p>
        </div>

        {!open ? (
          <div>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.button}
            </Button>
          </div>
        ) : (
          <>
            {error ? <Alert tone="error">{error}</Alert> : null}

            <Alert tone="error">
              {summary.isLastMember ? (
                <>
                  {t.organizationGoesToo} <strong>{summary.organizationName}</strong>
                  {losses.length > 0 ? (
                    <>{fill(misc.deleteAccountLosses, { losses: losses.join(", ") })}</>
                  ) : (
                    "."
                  )}
                </>
              ) : (
                <>
                  <strong>{summary.organizationName}</strong> {t.organizationStays}
                </>
              )}
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="delete-password" label={t.password}>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
              </FormField>

              <FormField
                id="delete-confirmation"
                label={t.confirmation}
                hint={fill(misc.deleteAccountPhraseHint, { phrase: accountDeletePhrase(v) })}
              >
                <Input
                  id="delete-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button
                size="sm"
                variant="danger"
                onClick={submit}
                // Przycisk zostaje nieaktywny, dopóki fraza się nie zgadza —
                // walidacja po stronie serwera i tak sprawdzi to ponownie.
                disabled={busy || confirmation.trim() !== accountDeletePhrase(v) || !password}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {misc.deleteAccountForever}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setPassword("");
                  setConfirmation("");
                }}
                disabled={busy}
              >
                {d.panel.common.cancel}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
