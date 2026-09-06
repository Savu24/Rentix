"use client";

import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Przełącznik organizacji w pasku górnym.
 *
 * Pokazuje się dopiero od dwóch organizacji — przy jednej byłby listą wyboru
 * z jedną pozycją, czyli zagadką „czego mi tu brakuje". Kto prowadzi własny
 * najem i nikomu nie pomaga, nigdy go nie zobaczy.
 *
 * Natywny `<select>`, tak jak w reszcie panelu: na telefonie otwiera systemowy
 * picker, a przełączanie kont bywa właśnie tym, co robi się w biegu.
 *
 * Wybór idzie do bazy (`users.activeOrganizationId`), a nie do tokenu sesji —
 * token żyje trzydzieści dni, więc zapisany w nim przełączałby konto
 * z opóźnieniem i osobno na każdym urządzeniu. Po zapisie `router.refresh()`
 * przerysowuje panel: dane, plan i język biorą się z nowej organizacji.
 */
export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: { id: string; name: string }[];
  activeId: string;
}) {
  const { d } = useI18n();
  const t = d.panel.shell.organizations;
  const router = useRouter();
  /*
    Dwa stany, bo przełączenie ma dwie fazy: zapis wyboru i przerysowanie
    panelu z serwera. `useTransition` wie, kiedy kończy się ta druga —
    `router.refresh()` niczego nie zwraca, więc bez tego lista zostawałaby
    zablokowana na zawsze i drugie przełączenie wymagałoby przeładowania
    strony.
  */
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = saving || refreshing;
  const [error, setError] = useState<string | null>(null);

  if (organizations.length < 2) return null;

  async function switchTo(organizationId: string) {
    if (organizationId === activeId) return;

    setSaving(true);
    setError(null);

    const result = await api.put("/api/organization/active", { organizationId });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Lista zostaje zablokowana do końca przerysowania: przełączona wizualnie
    // przy wciąż starych danych na ekranie wyglądałaby jak przełączenie,
    // które nie zadziałało.
    startRefresh(() => router.refresh());
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Building2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />

      <div className="relative min-w-0">
        <select
          aria-label={t.switchAria}
          value={activeId}
          disabled={busy}
          onChange={(event) => switchTo(event.target.value)}
          className="max-w-[11rem] truncate rounded-control border border-transparent bg-transparent py-1.5 pl-1.5 pr-7 text-sm font-medium text-fg transition-colors hover:border-border hover:bg-surface-alt focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-wait disabled:opacity-60"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>

        {busy ? (
          <Loader2
            className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted"
            aria-hidden
          />
        ) : null}
      </div>

      {/* Błąd przy pasku, nie w oknie dialogowym: przełączenie jest drobne,
          a jego niepowodzenie ma być widać dokładnie tam, gdzie się kliknęło. */}
      {error ? <span className="text-xs text-bad">{error}</span> : null}
    </div>
  );
}
