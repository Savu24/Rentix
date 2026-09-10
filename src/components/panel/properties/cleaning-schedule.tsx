"use client";

import {
  BrushCleaning,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { monthKey } from "@/lib/cleaning/rotation";
import type { CleaningMonth, CleaningScheduleView } from "@/lib/cleaning/service";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDayRangeIn, monthNames } from "@/lib/i18n/format";

/**
 * Harmonogram sprzątania części wspólnych.
 *
 * Sekcja pokazuje się tylko tam, gdzie jest co dzielić: przy dwóch pokojach
 * i więcej albo przy najmie całości na dwoje najemców. Przy jednym pokoju
 * rozpiska mówiłaby jednej osobie, że sprząta zawsze — a po taką informację
 * nikt nie wchodzi na kartę mieszkania.
 *
 * Miesiąc przewija się bez przeładowania strony, bo to jedyne, co użytkownik
 * tu robi: patrzy na wrzesień, potem na październik i wraca.
 */
export function CleaningSchedule({
  propertyId,
  initialMonth,
  initialSchedule,
}: {
  propertyId: string;
  /** Miesiąc, na którym otwiera się sekcja — wyliczony na serwerze. */
  initialMonth: CleaningMonth;
  initialSchedule: CleaningScheduleView;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.cleaning;

  const [month, setMonth] = useState<CleaningMonth>(initialMonth);
  const [schedule, setSchedule] = useState<CleaningScheduleView>(initialSchedule);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = monthKey(month.year, month.monthIndex);
  const monthLabel = `${monthNames(locale)[month.monthIndex]} ${month.year}`;
  const hasSchedule = schedule.duties.length > 0;

  async function step(delta: number) {
    const next = normalizeMonth(month.year, month.monthIndex + delta);

    setBusy(true);
    setError(null);
    const result = await api.get<CleaningScheduleView>(
      `/api/properties/${propertyId}/cleaning?month=${monthKey(next.year, next.monthIndex)}`,
    );
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Miesiąc przestawiamy dopiero po udanym odczycie: nagłówek z październikiem
    // nad wrześniową tabelą kłamałby o tym, co widać pod spodem.
    setMonth(next);
    setSchedule(result.data);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const result = await api.post<CleaningScheduleView>(
      `/api/properties/${propertyId}/cleaning`,
      { month: key },
    );
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSchedule(result.data);
  }

  async function clear() {
    setBusy(true);
    setError(null);
    const result = await api.delete(`/api/properties/${propertyId}/cleaning?month=${key}`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Kasowanie nie ma czego zwrócić, więc czyścimy samą tabelę — lista
    // uczestników opisuje nieruchomość, a nie ten jeden miesiąc.
    setSchedule((current) => ({ ...current, duties: [] }));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-baseline gap-2 text-[15px] font-semibold text-fg">
          <span className="flex items-center gap-2">
            <BrushCleaning className="h-4 w-4 text-muted" aria-hidden />
            {t.title}
          </span>
          <span className="text-sm font-normal text-muted">
            {schedule.participants[0]?.kind === "TENANT" ? t.byTenants : t.byRooms}
          </span>
        </h2>

        {hasSchedule ? (
          <span className="flex items-center gap-0.5">
            <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {t.regenerate}
            </Button>
            <Button size="sm" variant="ghost" onClick={clear} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{fill(t.clearLabel, { month: monthLabel })}</span>
            </Button>
          </span>
        ) : null}
      </div>

      <Card>
        <CardContent className="flex flex-col p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => step(-1)}
              disabled={busy}
              aria-label={t.previousMonth}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>

            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden />
              ) : null}
              {monthLabel}
            </p>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => step(1)}
              disabled={busy}
              aria-label={t.nextMonth}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {error ? (
            <div className="p-4">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          {hasSchedule ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{`${t.title} — ${monthLabel}`}</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th scope="col" className="px-4 py-2 font-medium">
                      {t.weekColumn}
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      {t.datesColumn}
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      {t.whoColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.duties.map((duty, index) => {
                    const current = isCurrentWeek(duty.startsOn, duty.endsOn);

                    return (
                      <tr
                        key={duty.startsOn}
                        className={[
                          index > 0 ? "border-t border-border" : "",
                          // Tydzień, w którym stoimy — po to właściciel tu wchodzi.
                          current ? "bg-accent-soft" : "",
                        ].join(" ")}
                      >
                        <td className="tabular px-4 py-2.5 font-mono text-muted">{duty.index}</td>
                        <td className="tabular px-4 py-2.5 whitespace-nowrap text-muted">
                          {formatDayRangeIn(duty.startsOn, duty.endsOn, locale)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-fg">
                          <span className="flex flex-wrap items-center gap-2">
                            {duty.label}
                            {current ? <Badge tone="accent">{t.thisWeek}</Badge> : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-[15px] font-semibold text-fg">{t.emptyTitle}</p>
              <p className="max-w-sm text-sm leading-relaxed text-muted">{t.emptyLead}</p>
              <Button size="sm" onClick={generate} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <BrushCleaning className="h-4 w-4" aria-hidden />
                )}
                {busy ? t.working : t.generate}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted">{t.rule}</p>
    </section>
  );
}

/** Miesiąc spoza zakresu 0–11 przenosimy na sąsiedni rok. */
function normalizeMonth(year: number, monthIndex: number): CleaningMonth {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  return { year: first.getUTCFullYear(), monthIndex: first.getUTCMonth() };
}

/**
 * Czy dyżur wypada na dziś.
 *
 * Dzień bierzemy w UTC, tak jak zapisane są granice tygodni. Data lokalna
 * wypadłaby na serwerze i w przeglądarce w dwóch różnych strefach, a React
 * zgłosiłby rozjazd przy nawodnieniu.
 */
function isCurrentWeek(startsOn: string, endsOn: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return startsOn <= today && today <= endsOn;
}
