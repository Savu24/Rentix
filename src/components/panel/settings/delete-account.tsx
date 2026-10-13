"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { signOutAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
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
 * Na stronie zostaje sama czerwona belka z przyciskiem, na końcu ustawień —
 * nie dlatego, że jest wstydliwa, tylko żeby nie sąsiadowała z „Zapisz"
 * w formularzu obok. Reszta dzieje się w oknie (redesign/19-usun-konto-modal.svg).
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

  function close() {
    setOpen(false);
    setError(null);
    setPassword("");
    setConfirmation("");
  }

  const phrase = accountDeletePhrase(v);

  return (
    <>
      <section className="flex flex-wrap items-center gap-3 rounded-tile border border-bad-soft bg-surface px-5 py-5 lg:px-6">
        <Trash2 className="size-[18px] shrink-0 text-bad" aria-hidden />
        <h2 className="flex-1 text-[15px] font-semibold text-bad-ink">{t.title}</h2>
        <Button variant="danger-soft" onClick={() => setOpen(true)}>
          {t.button}
        </Button>
      </section>

      <Dialog open={open} onClose={close} title={t.dialogTitle} closeLabel={d.panel.common.close}>
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Wiersz na organizację, w kolejności dołączania. Skutek pokazany
              plakietką i liczbami, nie zdaniem: przy trzech organizacjach
              zdanie robi się nie do przeczytania. */}
          <section aria-label={t.organizationsHeading} className="flex flex-col rounded-card bg-bad-soft px-4">
            <ul className="flex flex-col divide-y divide-bad/25">
              {organizations.map((organization) => {
                const losses = organization.deleted && organization.counts ? lossesOf(organization.counts) : "";
                return (
                  <li key={organization.id} className="flex flex-col gap-1 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-[14.5px] font-semibold text-bad-ink">{organization.name}</span>
                      <Badge tone={organization.deleted ? "critical" : "neutral"} icon={organization.deleted ? Trash2 : undefined}>
                        {organization.deleted ? t.goes : t.stays}
                      </Badge>
                    </div>
                    {organization.deleted ? (
                      losses ? <span className="text-[13.5px] text-bad-ink">{losses}</span> : null
                    ) : (
                      <span className="text-[13.5px] text-muted">
                        {organization.keptReason === "OTHER_MEMBERS"
                          ? t.organizationStaysMembers
                          : t.organizationStaysNotOwner}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <FormField id="delete-confirmation" label={fill(misc.deleteAccountPhraseHint, { phrase })}>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="font-mono"
              disabled={busy}
            />
          </FormField>

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

          {anythingGoes ? (
            <p className="flex items-center gap-2 text-[13.5px] font-[550] text-bad">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
              {t.noWayBack}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button
            variant="danger"
            onClick={submit}
            // Przycisk zostaje nieaktywny, dopóki fraza się nie zgadza —
            // walidacja po stronie serwera i tak sprawdzi to ponownie.
            disabled={busy || confirmation.trim() !== phrase || !password}
          >
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Trash2 className="size-[18px]" aria-hidden />}
            {misc.deleteAccountForever}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
