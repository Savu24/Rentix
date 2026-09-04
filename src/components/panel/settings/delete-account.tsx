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
import { plural } from "@/lib/utils";
import { ACCOUNT_DELETE_PHRASE } from "@/lib/validations/settings";

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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const items: Array<[number, [string, string, string]]> = [
    [summary.properties, ["nieruchomość", "nieruchomości", "nieruchomości"]],
    [summary.tenants, ["najemca", "najemców", "najemców"]],
    [summary.leases, ["umowa", "umowy", "umów"]],
    [summary.invoices, ["dokument rozliczeniowy", "dokumenty rozliczeniowe", "dokumentów rozliczeniowych"]],
    [summary.payments, ["wpłata", "wpłaty", "wpłat"]],
    [summary.expenses, ["koszt", "koszty", "kosztów"]],
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
          <h2 className="text-[15px] font-semibold text-fg">Usunięcie konta</h2>
          <p className="mt-0.5 text-sm text-muted">
            Operacja nieodwracalna. Nie ma kosza ani kopii, z której dałoby się to cofnąć.
          </p>
        </div>

        {!open ? (
          <div>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Usuń konto
            </Button>
          </div>
        ) : (
          <>
            {error ? <Alert tone="error">{error}</Alert> : null}

            <Alert tone="error">
              {summary.isLastMember ? (
                <>
                  Razem z kontem zniknie organizacja <strong>{summary.organizationName}</strong>
                  {losses.length > 0 ? (
                    <>
                      {" "}
                      i wszystko, co do niej należy: {losses.join(", ")}.
                    </>
                  ) : (
                    "."
                  )}
                </>
              ) : (
                <>
                  Organizacja <strong>{summary.organizationName}</strong> zostanie, bo ma innych
                  członków. Usuwamy wyłącznie Twoje konto i dostęp do niej.
                </>
              )}
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="delete-password" label="Hasło">
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
                label="Potwierdzenie"
                hint={`Przepisz: ${ACCOUNT_DELETE_PHRASE}`}
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
                disabled={busy || confirmation.trim() !== ACCOUNT_DELETE_PHRASE || !password}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Usuń konto na zawsze
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
                Anuluj
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
