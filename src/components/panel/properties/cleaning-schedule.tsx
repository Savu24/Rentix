"use client";

import { BrushCleaning, Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { ActionMenu } from "@/components/panel/action-menu";
import { SectionCard } from "@/components/panel/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput, isoToDateText } from "@/components/ui/date-input";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { api } from "@/lib/api/client";
import type { CleaningScheduleView } from "@/lib/cleaning/service";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDayRangeIn, monthNames, pluralize } from "@/lib/i18n/format";

/**
 * Harmonogram sprzątania części wspólnych.
 *
 * Sekcja pokazuje się tylko tam, gdzie jest co dzielić: przy dwóch pokojach
 * i więcej albo przy najmie całości na dwoje najemców. Przy jednym pokoju
 * rozpiska mówiłaby jednej osobie, że sprząta zawsze — a po taką informację
 * nikt nie wchodzi na kartę mieszkania.
 *
 * Nieruchomość ma jedną rozpiskę naraz — od dnia do dnia, zwykle na rok.
 * Właściciel podaje zakres, dostaje listę tygodni i kartkę PDF na lodówkę.
 */
export function CleaningSchedule({
  propertyId,
  initialSchedule,
}: {
  propertyId: string;
  initialSchedule: CleaningScheduleView;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.cleaning;

  const [schedule, setSchedule] = useState<CleaningScheduleView>(initialSchedule);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSchedule = schedule.range !== null;

  // Formularz zakresu stoi otwarty, gdy rozpiski nie ma — wtedy jest jedyną
  // rzeczą do zrobienia. Przy istniejącej otwiera go „wygeneruj ponownie".
  const [formOpen, setFormOpen] = useState(false);
  const [from, setFrom] = useState(() => schedule.range?.from ?? todayIso());
  const [to, setTo] = useState(() => schedule.range?.to ?? addYear(todayIso()));

  const showForm = !hasSchedule || formOpen;

  async function generate() {
    setBusy(true);
    setError(null);
    const result = await api.post<CleaningScheduleView>(
      `/api/properties/${propertyId}/cleaning`,
      { from, to },
    );
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSchedule(result.data);
    setFormOpen(false);
  }

  async function clear() {
    setBusy(true);
    setError(null);
    const result = await api.delete(`/api/properties/${propertyId}/cleaning`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Kasowanie nie ma czego zwrócić, więc czyścimy samą rozpiskę — lista
    // uczestników opisuje nieruchomość, a nie ten jeden harmonogram.
    setSchedule((current) => ({ ...current, range: null, duties: [] }));
  }

  function openForm() {
    if (schedule.range) {
      setFrom(schedule.range.from);
      setTo(schedule.range.to);
    }
    setError(null);
    setFormOpen(true);
  }

  return (
    <SectionCard
      title={t.title}
      icon={BrushCleaning}
      // Kto rotuje dyżury: najemcy po kolei czy pokoje po kolei.
      count={schedule.participants[0]?.kind === "TENANT" ? t.byTenants : t.byRooms}
      actions={
        hasSchedule ? (
          <>
            {/*
              Zwykły link, nie fetch: przeglądarka ma sama zapisać plik, a treść
              wraca prosto z serwera, więc nie ma tu czego trzymać w stanie.
            */}
            <Button asChild size="sm" variant="secondary">
              <a href={`/api/properties/${propertyId}/cleaning/pdf`} title={t.downloadLabel}>
                <Download className="size-4" aria-hidden />
                PDF
              </a>
            </Button>
            <ActionMenu
              label={d.panel.common.more}
              items={[
                { label: t.regenerate, icon: RefreshCw, disabled: busy || formOpen, onSelect: openForm },
                { label: t.clearLabel, icon: Trash2, danger: true, disabled: busy, onSelect: clear },
              ]}
            />
          </>
        ) : null
      }
      bodyClassName="px-0 pt-3 pb-0 lg:px-0 lg:pb-0"
      footer={
        schedule.range ? (
          <>
            <span className="text-sm font-[550] text-muted">
              {fill(t.until, { date: isoToDateText(schedule.range.to, locale) })}
            </span>
            <span className="text-sm text-muted">
              {fill(pluralize(locale, schedule.duties.length, t.weeks), {
                count: schedule.duties.length,
              })}
            </span>
          </>
        ) : undefined
      }
    >
      {error ? (
        <div className="px-4 pb-3 lg:px-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {showForm ? (
        <div className="flex flex-col gap-4 px-4 pb-5 lg:px-6">
          {hasSchedule ? (
            <p className="text-sm font-semibold text-fg">{t.regenerate}</p>
          ) : (
            <p className="text-sm text-muted">{t.emptyTitle}</p>
          )}

          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <FormField id={`cleaning-from-${propertyId}`} label={t.from}>
              <DateInput
                {...fieldAria(`cleaning-from-${propertyId}`, {})}
                value={from}
                disabled={busy}
                onChange={(event) => setFrom(event.target.value)}
              />
            </FormField>
            <FormField id={`cleaning-to-${propertyId}`} label={t.to}>
              <DateInput
                {...fieldAria(`cleaning-to-${propertyId}`, {})}
                value={to}
                min={from || undefined}
                disabled={busy}
                onChange={(event) => setTo(event.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={generate} disabled={busy || !from || !to}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <BrushCleaning className="size-4" aria-hidden />
              )}
              {busy ? t.working : t.generate}
            </Button>
            {hasSchedule ? (
              <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)} disabled={busy}>
                {t.cancel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {schedule.range ? <DutiesTable schedule={schedule} range={schedule.range} /> : null}
    </SectionCard>
  );
}

function DutiesTable({
  schedule,
  range,
}: {
  schedule: CleaningScheduleView;
  range: { from: string; to: string };
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.cleaning;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const row = currentRef.current;
    if (!frame || !row) return;

    // Przewijamy samą ramkę, nie stronę: `scrollIntoView` szarpnąłby całą
    // kartę nieruchomości do góry, zanim właściciel zobaczył, gdzie jest.
    frame.scrollTop = row.offsetTop - frame.clientHeight / 2 + row.clientHeight / 2;
  }, [schedule]);

  const period = `${isoToDateText(range.from, locale)} - ${isoToDateText(range.to, locale)}`;
  const months = monthNames(locale);

  let lastMonth = "";

  return (
    <>
      <div ref={frameRef} className="relative max-h-[26rem] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{`${t.title}, ${period}`}</caption>
          <thead className="sticky top-0 bg-surface">
            <tr className="border-y border-border bg-hover text-left text-[12.5px] text-muted">
              <th scope="col" className="px-4 py-2.5 font-[550] lg:px-6">
                {t.weekColumn}
              </th>
              <th scope="col" className="px-4 py-2.5 font-[550] lg:px-6">
                {t.datesColumn}
              </th>
              <th scope="col" className="px-4 py-2.5 font-[550] lg:px-6">
                {t.whoColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {schedule.duties.map((duty) => {
              const current = isCurrentWeek(duty.startsOn, duty.endsOn);
              const monthOf = duty.startsOn.slice(0, 7);
              const newMonth = monthOf !== lastMonth;
              lastMonth = monthOf;

              const monthLabel = `${months[Number(monthOf.slice(5)) - 1]} ${monthOf.slice(0, 4)}`;

              return (
                <MonthRows key={duty.startsOn} heading={newMonth ? monthLabel : null}>
                  <tr
                    ref={current ? currentRef : undefined}
                    className={[
                      "border-t border-border",
                      // Tydzień, w którym stoimy — po to właściciel tu wchodzi.
                      current ? "bg-accent-soft text-accent" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-2.5 font-mono text-[13.5px] lg:px-6">{duty.index}</td>
                    <td className="px-4 py-2.5 font-mono text-[13.5px] whitespace-nowrap lg:px-6">
                      {formatDayRangeIn(duty.startsOn, duty.endsOn, locale)}
                    </td>
                    <td className="px-4 py-2.5 text-[13.5px] font-semibold lg:px-6">
                      <span className="flex flex-wrap items-center gap-2">
                        {duty.label}
                        {current ? <Badge tone="accent">{t.thisWeek}</Badge> : null}
                      </span>
                    </td>
                  </tr>
                </MonthRows>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Wiersz tygodnia, poprzedzony nagłówkiem miesiąca, gdy to jego pierwszy tydzień. */
function MonthRows({ heading, children }: { heading: string | null; children: ReactNode }) {
  return (
    <>
      {heading ? (
        <tr className="border-t border-border bg-surface-alt">
          <th
            scope="colgroup"
            colSpan={3}
            className="px-4 py-1.5 text-left text-xs font-[550] capitalize text-subtle lg:px-6"
          >
            {heading}
          </th>
        </tr>
      ) : null}
      {children}
    </>
  );
}

/** Dzisiejszy dzień kalendarza w UTC — tak zapisane są granice tygodni. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Rok do przodu bez jednego dnia: 10.07.2026 → 09.07.2027, pełne 52 tygodnie i dzień. */
function addYear(iso: string): string {
  const date = new Date(iso);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Czy dyżur wypada na dziś.
 *
 * Dzień bierzemy w UTC, tak jak zapisane są granice tygodni. Data lokalna
 * wypadłaby na serwerze i w przeglądarce w dwóch różnych strefach, a React
 * zgłosiłby rozjazd przy nawodnieniu.
 */
function isCurrentWeek(startsOn: string, endsOn: string): boolean {
  const today = todayIso();
  return startsOn <= today && today <= endsOn;
}
