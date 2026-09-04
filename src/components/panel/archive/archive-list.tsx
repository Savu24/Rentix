"use client";

import { CheckSquare, Loader2, RotateCcw, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { plural } from "@/lib/utils";

export type ArchivedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  /** Kiedy trafiło do archiwum — null, gdy data nie jest znana. */
  archivedAt: Date | null;
};

/** Odmiana rzeczownika dla komunikatów: „2 najemców przywrócono". */
export type ArchiveNouns = [string, string, string];

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

/**
 * Archiwum jednej kartoteki: zaznaczanie, przywracanie i usuwanie na zawsze.
 *
 * Ten sam komponent obsługuje nieruchomości, najemców i właścicieli — różnią
 * się tylko ścieżką API i odmianą rzeczownika. Trzy osobne implementacje
 * rozjechałyby się przy pierwszej zmianie zachowania, a to jest miejsce,
 * w którym pomyłka kasuje dane bezpowrotnie.
 *
 * Usuwanie trwałe potrafi się nie udać dla części zaznaczonych — nieruchomość
 * z umowami albo najemca z historią nie znikną. Dlatego raportujemy wynik
 * pozycja po pozycji, zamiast pokazywać jeden komunikat „gotowe".
 */
export function ArchiveList({
  items,
  endpoint,
  nouns,
}: {
  items: ArchivedItem[];
  /** Ścieżka API kartoteki, np. „/api/tenants". */
  endpoint: string;
  nouns: ArchiveNouns;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
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
      setMessage(
        mode === "restore"
          ? `Przywrócono ${done} ${plural(done, nouns)}.`
          : `Usunięto na zawsze ${done} ${plural(done, nouns)}.`,
      );
    }

    router.refresh();
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted">
          Archiwum jest puste. Trafiają tu pozycje, które zarchiwizujesz. Nic nie znika
          bezpowrotnie, dopóki sam tego nie zdecydujesz.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? <Alert tone="success">{message}</Alert> : null}

      {problems.length > 0 ? (
        <Alert tone="error">
          <p className="font-medium">Część pozycji została nietknięta:</p>
          <ul className="mt-1 list-disc pl-4">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2.5 rounded-control border border-border bg-surface px-3 py-2.5 shadow-sm">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
          disabled={busy !== null}
        >
          {allSelected ? (
            <Square className="h-4 w-4" aria-hidden />
          ) : (
            <CheckSquare className="h-4 w-4" aria-hidden />
          )}
          {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
        </Button>

        <span className="text-xs text-muted" aria-live="polite">
          {selected.size === 0
            ? "Nic nie zaznaczono"
            : `${selected.size} ${plural(selected.size, nouns)}`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => run("restore")}
            disabled={selected.size === 0 || busy !== null}
          >
            {busy === "restore" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            Przywróć
          </Button>

          <Button
            size="sm"
            variant={confirmingDelete ? "danger" : "secondary"}
            onClick={() => (confirmingDelete ? run("delete") : setConfirmingDelete(true))}
            disabled={selected.size === 0 || busy !== null}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            {confirmingDelete ? "Na pewno? Usuń trwale" : "Usuń trwale"}
          </Button>
        </div>
      </div>

      {confirmingDelete ? (
        <Alert tone="warning">
          Tego się nie cofnie. Nie ma kosza ani kopii. Pozycje powiązane z umowami albo
          fakturami zostaną pominięte, bo ich usunięcie zerwałoby historię rozliczeń.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col p-0">
          {items.map((item, index) => {
            const isSelected = selected.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index > 0 ? "border-t border-border" : ""
                } ${isSelected ? "bg-accent-soft/40" : "hover:bg-surface-alt"}`}
              >
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                    isSelected ? "border-accent bg-accent text-accent-contrast" : "border-border"
                  }`}
                >
                  {isSelected ? <CheckSquare className="h-3 w-3" /> : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{item.title}</span>
                  {item.subtitle ? (
                    <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                  ) : null}
                </span>

                {item.archivedAt ? (
                  <span className="shrink-0 text-xs text-muted">
                    {dateFormat.format(item.archivedAt)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
