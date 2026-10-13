"use client";

import { AlertCircle, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { fieldControl } from "@/components/ui/input";
import { usePopover } from "@/components/panel/use-popover";
import { api } from "@/lib/api/client";
import type { UserOrganization } from "@/lib/auth/session";
import { useI18n } from "@/lib/i18n/client";
import { cn, initials } from "@/lib/utils";

/**
 * Przełączanie organizacji — wspólne dla karty w pasku bocznym i listy
 * w arkuszu „Więcej" na telefonie.
 *
 * Wybór idzie do bazy (`users.activeOrganizationId`), a nie do tokenu sesji —
 * token żyje trzydzieści dni, więc zapisany w nim przełączałby konto
 * z opóźnieniem i osobno na każdym urządzeniu. Po zapisie `router.refresh()`
 * przerysowuje panel: dane, plan i język biorą się z nowej organizacji.
 */
function useOrganizationSwitch(activeId: string) {
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
  const [error, setError] = useState<string | null>(null);

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

  return { switchTo, busy: saving || refreshing, error };
}

/**
 * Karta organizacji pod logo w pasku bocznym: nazwa i plan.
 *
 * Widoczna zawsze, bo mówi, czyje dane widać obok i na jakim planie — ale
 * listę rozwija dopiero od dwóch organizacji. Przy jednej byłaby listą wyboru
 * z jedną pozycją, czyli zagadką „czego mi tu brakuje".
 */
export function SidebarOrganization({
  organizations,
  activeId,
  planLabel,
}: {
  organizations: UserOrganization[];
  activeId: string;
  planLabel: string;
}) {
  const { d } = useI18n();
  const t = d.panel.shell.organizations;
  const { switchTo, busy, error } = useOrganizationSwitch(activeId);
  const { open, setOpen, close, rootRef, triggerRef } = usePopover();

  const active = organizations.find((organization) => organization.id === activeId);
  const name = active?.name ?? "";
  const switchable = organizations.length > 1;

  const card = (
    <>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-side-line text-[11px] font-[650] text-side-ink"
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className="block truncate text-[13.5px] leading-[18px] font-semibold text-side-active-ink"
          title={name}
        >
          {name}
        </span>
        <span className="block truncate text-xs leading-4 text-side-ink-2">{planLabel}</span>
      </span>
    </>
  );

  const cardClass =
    "flex h-12 w-full items-center gap-2.5 rounded-[10px] bg-side-active/55 px-2.5";

  if (!switchable) return <div className={cardClass}>{card}</div>;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t.switchAria}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          cardClass,
          "transition-colors hover:bg-side-active focus-visible:outline-side-on disabled:cursor-wait",
        )}
      >
        {card}
        {busy ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin text-side-ink-2" aria-hidden />
        ) : (
          <ChevronsUpDown className="size-[18px] shrink-0 text-side-ink-2" aria-hidden />
        )}
      </button>

      {open ? (
        <ul
          aria-label={t.switchAria}
          className="absolute top-full left-0 z-50 mt-1.5 w-[300px] rounded-card bg-surface p-2 shadow-float"
        >
          {organizations.map((organization) => {
            const selected = organization.id === activeId;

            return (
              <li key={organization.id}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => {
                    close();
                    void switchTo(organization.id);
                  }}
                  className={cn(
                    "flex h-[52px] w-full items-center gap-3 rounded-[10px] px-3 text-left transition-colors",
                    selected ? "bg-accent-soft" : "hover:bg-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-[650]",
                      selected ? "bg-accent text-accent-contrast" : "bg-surface-alt text-muted",
                    )}
                    aria-hidden
                  >
                    {initials(organization.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-[18px] font-semibold text-fg">
                      {organization.name}
                    </span>
                    <span className="block truncate text-[12.5px] leading-4 text-muted">
                      {selected ? planLabel : d.panel.team.roles[organization.role]}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="size-[18px] shrink-0 text-accent" strokeWidth={2.2} aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Błąd przy karcie, nie w oknie dialogowym: przełączenie jest drobne,
          a jego niepowodzenie ma być widać dokładnie tam, gdzie się kliknęło. */}
      {error ? (
        <p role="alert" className="mt-2 flex gap-1.5 px-1 text-xs text-side-active-ink">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Przełącznik organizacji w arkuszu „Więcej" na telefonie.
 *
 * Natywny `<select>`, tak jak w reszcie panelu: na telefonie otwiera systemowy
 * picker, a przełączanie kont bywa właśnie tym, co robi się w biegu. Przy
 * jednej organizacji nic nie rysuje.
 */
export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: UserOrganization[];
  activeId: string;
}) {
  const { d } = useI18n();
  const t = d.panel.shell.organizations;
  const { switchTo, busy, error } = useOrganizationSwitch(activeId);

  if (organizations.length < 2) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative min-w-0">
        <select
          aria-label={t.switchAria}
          value={activeId}
          disabled={busy}
          onChange={(event) => switchTo(event.target.value)}
          className={cn(fieldControl, "h-12 appearance-none pr-10 pl-3 text-[15px] font-medium")}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>

        {busy ? (
          <Loader2
            className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 animate-spin text-subtle"
            aria-hidden
          />
        ) : (
          <ChevronsUpDown
            className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-subtle"
            aria-hidden
          />
        )}
      </div>

      {error ? (
        <p role="alert" className="flex gap-1.5 text-[12.5px] font-medium text-bad">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
