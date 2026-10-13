"use client";

import { AlertTriangle, Archive, Check, Loader2, Minus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export type ArchivedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  /** Kiedy trafiło do archiwum — null, gdy data nie jest znana. */
  archivedAt: Date | null;
};

/**
 * Odmiana rzeczownika dla komunikatów: „2 najemców przywrócono".
 *
 * Tablica, nie trójka: polski ma trzy formy, angielski dwie, a o wyborze
 * decyduje `pluralize` regułami języka, nie długość tablicy.
 */
export type ArchiveNouns = readonly string[];

/**
 * Archiwum jednej kartoteki: zaznaczanie, przywracanie i usuwanie na zawsze
 * (redesign/20-archiwum.svg — jeden wzorzec dla wszystkich archiwów).
 *
 * Ten sam komponent obsługuje nieruchomości, najemców, umowy i właścicieli —
 * różnią się tylko ścieżką API i odmianą rzeczownika. Osobne implementacje
 * rozjechałyby się przy pierwszej zmianie zachowania, a to jest miejsce,
 * w którym pomyłka kasuje dane bezpowrotnie.
 *
 * Usuwanie trwałe idzie na dwa kliknięcia w tym samym przycisku („Usuń
 * trwale" → „Na pewno? Usuń trwale") i potrafi się nie udać dla części
 * zaznaczonych — nieruchomość z umowami albo najemca z historią nie znikną.
 * Dlatego wynik raportujemy pozycja po pozycji, a nie jednym „gotowe".
 */
export function ArchiveList({
  items,
  endpoint,
  nouns,
  columnLabel,
}: {
  items: ArchivedItem[];
  /** Ścieżka API kartoteki, np. „/api/tenants". */
  endpoint: string;
  nouns: ArchiveNouns;
  /** Nagłówek pierwszej kolumny („Nieruchomość", „Najemca"). */
  columnLabel: string;
}) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const t = d.panel.archive;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setConfirmingDelete(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(mode: "restore" | "delete") {
    setBusy(mode);
    setProblems([]);
    setMessage(null);

    const chosen = items.filter((item) => selected.has(item.id));
    const failures: string[] = [];
    let done = 0;

    // Po kolei, nie równolegle: przy trwałym usuwaniu każdy element może
    // odbić się o własny warunek, a wynik ma być czytelny co do sztuki.
    for (const item of chosen) {
      const result =
        mode === "restore"
          ? await api.post(`${endpoint}/${item.id}/restore`, {})
          : await api.delete(`${endpoint}/${item.id}?force=true`);

      if (result.ok) done += 1;
      else failures.push(`${item.title}: ${result.message}`);
    }

    setBusy(null);
    setConfirmingDelete(false);
    setSelected(new Set());
    setProblems(failures);

    if (done > 0) {
      const noun = pluralize(locale, done, nouns);
      setMessage(fill(mode === "restore" ? t.restored : t.deleted, { count: done, noun }));
    }

    router.refresh();
  }

  const feedback = (
    <>
      {message ? <Alert tone="success">{message}</Alert> : null}
      {problems.length > 0 ? (
        <Alert tone="warning">
          <p>{t.partialFailure}</p>
          <ul className="mt-1 list-disc pl-4 font-normal">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </>
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {feedback}
        <EmptyState icon={Archive} title={t.empty} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {feedback}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex h-11 items-center gap-4 border-b border-border bg-hover px-4 text-[12.5px] font-[550] text-muted lg:px-5">
          <CheckMark
            state={allSelected ? "on" : someSelected ? "some" : "off"}
            label={allSelected ? t.deselectAll : t.selectAll}
            onClick={() => {
              setConfirmingDelete(false);
              setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
            }}
            disabled={busy !== null}
          />
          <span className="min-w-0 flex-1">{columnLabel}</span>
          <span className="hidden w-48 sm:block">{t.archivedAt}</span>
        </div>

        <ul>
          {items.map((item) => {
            const isSelected = selected.has(item.id);

            return (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <label
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-4 px-4 py-3 transition-colors lg:px-5",
                    isSelected ? "bg-accent-soft" : "hover:bg-hover",
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isSelected}
                    onChange={() => toggle(item.id)}
                    disabled={busy !== null}
                  />
                  <Box state={isSelected ? "on" : "off"} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14.5px] font-semibold break-words text-fg">{item.title}</span>
                    {item.subtitle ? (
                      <span className="truncate text-[13px] text-muted">{item.subtitle}</span>
                    ) : null}
                    {item.archivedAt ? (
                      <span className="font-mono text-[12.5px] text-subtle sm:hidden">
                        {formatDateIn(item.archivedAt, locale, "short")}
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden w-48 font-mono text-sm text-muted sm:block">
                    {item.archivedAt ? formatDateIn(item.archivedAt, locale, "short") : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pasek akcji: pojawia się dopiero przy zaznaczeniu i trzyma się dołu
          ekranu, żeby przy długiej liście nie trzeba było przewijać w górę. */}
      {selected.size > 0 ? (
        <div
          className="sticky bottom-24 z-30 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card bg-fg px-4 py-3 text-bg shadow-float lg:bottom-6 lg:px-5"
          aria-live="polite"
        >
          <span className="text-sm font-semibold">
            {fill(t.selectedCount, { count: selected.size, noun: pluralize(locale, selected.size, nouns) })}
          </span>
          {confirmingDelete ? (
            <span className="flex items-center gap-1.5 text-[13.5px] text-highlight">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
              {t.deleteWarning}
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              onClick={() => run("restore")}
              disabled={busy !== null}
              className="bg-bg/10 text-bg shadow-none hover:bg-bg/20"
            >
              {busy === "restore" ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-[18px]" aria-hidden />
              )}
              {t.restore}
            </Button>
            <Button
              variant="danger"
              onClick={() => (confirmingDelete ? run("delete") : setConfirmingDelete(true))}
              disabled={busy !== null}
              title={t.skipped}
            >
              {busy === "delete" ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-[18px]" aria-hidden />
              )}
              {confirmingDelete ? t.confirmDelete : t.deleteForever}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Rysunek pola wyboru — sam wygląd; zachowanie niesie natywny input obok. */
function Box({ state }: { state: "on" | "off" | "some" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
        state === "off" ? "border-border-strong bg-surface" : "border-accent bg-accent text-accent-contrast",
      )}
    >
      {state === "on" ? <Check className="size-3" strokeWidth={3} /> : null}
      {state === "some" ? <Minus className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

/** Pole „zaznacz wszystkie" w nagłówku tabeli. */
function CheckMark({
  state,
  label,
  onClick,
  disabled,
}: {
  state: "on" | "off" | "some";
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "on" ? true : state === "some" ? "mixed" : false}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex rounded-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Box state={state} />
    </button>
  );
}
