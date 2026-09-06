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
import type { OrganizationDeletion } from "@/lib/organizations/service";
import { accountDeletePhrase } from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
/**
 * Usunięcie konta.
 *
 * Sekcja jest domyślnie zwinięta i stoi na końcu ustawień — nie dlatego, że
 * jest wstydliwa, tylko żeby nie sąsiadowała z „Zapisz" w formularzu obok.
 *
 * Przed potwierdzeniem pokazujemy, co dokładnie zniknie, z liczbami. Ogólne
 * „stracisz swoje dane" nikogo nie zatrzymuje; „29 dokumentów rozliczeniowych"
 * zatrzymuje.
 *
 * Odkąd jedno konto bywa w kilku organizacjach, ostrzeżenie wypisuje je
 * wszystkie, po jednym wierszu na każdą: która znika, a która zostaje i
 * dlaczego. Jedno zdanie o „swojej organizacji" byłoby przy trzech kontach
 * zwyczajnie nieprawdziwe.
 */
export function DeleteAccount({
  organizations,
}: {
  organizations: OrganizationDeletion[];
}) {
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

  /** „5 nieruchomości, 29 dokumentów rozliczeniowych" — bez pustych pozycji. */
  function lossesOf(counts: NonNullable<OrganizationDeletion["counts"]>): string {
    const items: Array<[number, readonly string[]]> = [
      [counts.properties, nouns.properties],
      [counts.tenants, nouns.tenants],
      [counts.leases, nouns.leases],
      [counts.invoices, nouns.invoices],
      [counts.payments, nouns.payments],
      [counts.expenses, nouns.expenses],
    ];

    return items
      .filter(([count]) => count > 0)
      .map(([count, forms]) => `${count} ${plural(count, forms)}`)
      .join(", ");
  }

  /** Co się stanie z jedną organizacją — zdanie stojące za jej nazwą. */
  function fateOf(organization: OrganizationDeletion): string {
    if (!organization.deleted) {
      return organization.keptReason === "OTHER_MEMBERS"
        ? t.organizationStaysMembers
        : t.organizationStaysNotOwner;
    }

    const losses = organization.counts ? lossesOf(organization.counts) : "";
    return losses ? fill(t.organizationGoesWith, { losses }) : t.organizationGoes;
  }

  const anythingGoes = organizations.some((organization) => organization.deleted);

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
              <p className="font-semibold">{t.organizationsHeading}</p>

              {/* Wiersz na organizację, w kolejności dołączania. Lista, a nie
                  zdanie: przy trzech organizacjach zdanie robi się nie do
                  przeczytania, a to jest ekran, na którym trzeba zrozumieć
                  wszystko za pierwszym razem. */}
              <ul className="mt-1.5 flex flex-col gap-1">
                {organizations.map((organization) => (
                  <li key={organization.id}>
                    <strong>{organization.name}</strong> — {fateOf(organization)}
                  </li>
                ))}
              </ul>

              {anythingGoes ? <p className="mt-1.5">{t.noWayBack}</p> : null}
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
