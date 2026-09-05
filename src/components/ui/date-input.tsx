"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Separator dnia, miesiąca i roku.
 *
 * Kolejność członów jest w obu krajach ta sama — dzień, miesiąc, rok — więc
 * pomyłka o 3 grudnia zamiast 12 marca tu nie grozi. Zmienia się sam znak:
 * kropka w brytyjskiej dacie wygląda na literówkę, ukośnik w polskiej też.
 */
const SEPARATOR: Record<Locale, string> = { pl: ".", uk: "/" };

/** „2026-08-31" → „31.08.2026" / „31/08/2026". Pusto albo nie-data → pusty tekst. */
export function isoToDateText(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return "";

  const separator = SEPARATOR[locale];
  return `${match[3]}${separator}${match[2]}${separator}${match[1]}`;
}

/**
 * Maska „dd.mm.rrrr": kropki wstawiane w trakcie pisania, cyfry ponad osiem
 * odpadają.
 *
 * Kropka na końcu zostaje tylko wtedy, gdy właściciel sam ją wpisał — dopisana
 * automatycznie po drugiej cyfrze nie dałaby się skasować backspace'em, bo
 * maska wstawiałaby ją z powrotem przy każdym naciśnięciu.
 */
export function formatDateText(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter((part) => part.length > 0)
    .join(SEPARATOR[locale]);

  const typedSeparator = /\D$/.test(value) && (digits.length === 2 || digits.length === 4);
  return typedSeparator ? `${text}${SEPARATOR[locale]}` : text;
}

/** „31.08.2026" → „2026-08-31". Data niepełna albo nieistniejąca → "". */
export function dateTextToIso(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (digits.length !== 8) return "";

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (year < 1000 || month < 1 || month > 12 || day < 1) return "";

  // 31.02 albo 31.04 wygląda poprawnie znak po znaku — łapie je dopiero
  // porównanie z kalendarzem.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";

  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/**
 * Pole daty pisane po ludzku: dzień, miesiąc, rok.
 *
 * Natywny `input[type="date"]` układa człony według ustawień przeglądarki, więc
 * ten sam formularz pokazywał raz „dd.mm.rrrr", a raz „mm/dd/rrrr" — przy
 * przepisywaniu dat z umowy to prosta droga do 3 grudnia zamiast 12 marca.
 * Dlatego widoczna kontrolka jest zwykłym polem tekstowym z maską, a data
 * w formacie ISO („RRRR-MM-DD", tego oczekują walidacje i API) siedzi
 * w ukrytym `input[type="date"]` obok. Ten sam ukryty input daje kalendarz pod
 * przyciskiem, więc wybieranie myszką nie ginie.
 *
 * Zdarzenie `change` leci z ukrytego pola, więc `event.target.value` to zawsze
 * ISO — dla react-hook-form i dla pól sterowanych wygląda to tak samo jak
 * wcześniej. Niepełna data nie kasuje tego, co już zapisane: dopóki właściciel
 * pisze, wartość zostaje, a rozstrzyga się przy wyjściu z pola.
 */
export function DateInput({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  className,
  min,
  max,
  ref,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "type"> & { value?: string }) {
  const { d, locale } = useI18n();
  const holderRef = React.useRef<HTMLInputElement | null>(null);
  const textRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState(() => isoToDateText(value ?? "", locale));
  const emitted = React.useRef(value ?? "");

  /*
    Wartość ustawiona z zewnątrz — domyślne wartości formularza, `reset()`,
    „Wyczyść filtry". Podmieniamy tekst tylko wtedy, gdy pole nie jest pod
    kursorem: sterowany rodzic (np. adres w URL) potrafi oddać nową wartość
    z opóźnieniem i skasowałby to, co właściciel właśnie pisze.
  */
  // Bez listy zależności celowo: wartość bywa wstawiana prosto do DOM-u
  // (react-hook-form przez `ref`), więc nie ma czego obserwować — a wyjście
  // przy równych wartościach zamyka drogę do pętli renderów.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const external = value ?? holderRef.current?.value ?? "";
    if (external === emitted.current) return;
    if (document.activeElement === textRef.current) return;

    emitted.current = external;
    setText(isoToDateText(external, locale));
  });

  function emit(iso: string) {
    const holder = holderRef.current;
    if (!holder || iso === emitted.current) return;

    holder.value = iso;
    emitted.current = iso;

    // react-hook-form czyta wartość z `event.target`, więc podajemy mu ukryte
    // pole — razem z jego nazwą i formatem ISO.
    onChange?.({
      target: holder,
      currentTarget: holder,
      type: "change",
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  }

  function openPicker() {
    const holder = holderRef.current;

    if (holder && typeof holder.showPicker === "function") {
      try {
        holder.showPicker();
        return;
      } catch {
        // Przeglądarka odmówiła otwarcia kalendarza — zostaje wpisanie ręczne.
      }
    }

    textRef.current?.focus();
  }

  return (
    <div className={cn("relative flex min-w-0 items-center", className)}>
      <Input
        {...props}
        ref={textRef}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder={d.panel.dateInput.placeholder}
        className="pr-10"
        value={text}
        disabled={disabled}
        onChange={(event) => {
          const next = formatDateText(event.target.value, locale);
          setText(next);

          const iso = dateTextToIso(next);
          // Niepełnej daty nie zgłaszamy: inaczej każdy znak dopisywany do
          // poprawionej daty czyściłby po drodze to, co już zapisane.
          if (iso || next === "") emit(iso);
        }}
        onBlur={(event) => {
          if (!dateTextToIso(text) && text !== "") {
            // Data urwana w połowie albo nieistniejąca (31.02) nigdzie nie
            // trafi — pole nie może udawać, że jest inaczej.
            setText("");
            emit("");
          }

          onBlur?.(event);
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={d.panel.dateInput.openCalendar}
        className={cn(
          "absolute right-1 flex h-9 w-9 items-center justify-center rounded-control text-muted",
          "transition-colors hover:text-fg focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-50",
        )}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
      </button>

      {/*
        Nośnik wartości: trzyma ISO dla formularza i otwiera natywny kalendarz.
        Nie może być `display: none` — przeglądarka nie pokaże kalendarza
        z pola, którego nie renderuje.
      */}
      <input
        ref={(node) => {
          holderRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="date"
        name={name}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute right-4 bottom-0 h-px w-px opacity-0"
        onChange={(event) => {
          setText(isoToDateText(event.target.value, locale));
          emit(event.target.value);
        }}
      />
    </div>
  );
}
