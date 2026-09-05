import { z } from "zod";

import { fill } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { parseMoney } from "@/lib/money";

import { emailSchema } from "./auth";

/**
 * Bloki wspólne dla formularzy i API routes. Ta sama definicja po obu stronach —
 * komunikaty nie rozjeżdżają się między walidacją w przeglądarce a serwerem.
 *
 * Każdy blok jest funkcją przyjmującą kontekst wersji krajowej, bo reguły
 * naprawdę różnią się między krajami, a nie tylko brzmieniem komunikatu:
 * kod pocztowy „00-000" kontra „SW1A 1AA", rachunek 26-cyfrowy kontra sort code
 * z numerem konta, przecinek kontra kropka w kwocie. Sklejenie tego jednym
 * schematem dałoby albo walidację przepuszczającą wszystko, albo odrzucającą
 * poprawne dane jednego z krajów.
 *
 * Kontekst wchodzi z zewnątrz, bo ten plik importuje też komponent kliencki —
 * sięgnięcie po słownik w środku wciągnęłoby do przeglądarki teksty wszystkich
 * wersji naraz.
 */
export type ValidationContext = {
  locale: Locale;
  /** Cały słownik aktywnej wersji — schematy sięgają po sekcje, których potrzebują. */
  d: Dictionary;
};

/** Skrót do komunikatów walidacji, żeby nie powtarzać ścieżki w każdym bloku. */
const v = (context: ValidationContext) => context.d.panel.validation;

/** Pole tekstowe, które po przycięciu może być puste → zapisujemy NULL. */
export const optionalText = (context: ValidationContext, max: number) =>
  z
    .string()
    .trim()
    .max(max, fill(v(context).maxChars, { max }))
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const requiredText = (context: ValidationContext, label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, fill(v(context).required, { label }))
    .max(max, fill(v(context).maxChars, { max }));

/**
 * Kod pocztowy.
 *
 * Polski to pięć cyfr z myślnikiem. Brytyjski jest alfanumeryczny, ma od pięciu
 * do siedmiu znaków i stałą część końcową „cyfra + dwie litery" — regexp jest
 * ten sam, którego używa rząd w formularzach GOV.UK. Zapis normalizujemy do
 * wersji z jedną spacją i wielkimi literami, bo ludzie wpisują go na każdy
 * możliwy sposób, a na dokumencie ma wyglądać jednakowo.
 */
/**
 * Normalizuje zapis kodu pocztowego. Brytyjski idzie wielkimi literami z jedną
 * spacją przed trzema ostatnimi znakami („sw1a1aa" → „SW1A 1AA"), bo ludzie
 * wpisują go na każdy możliwy sposób, a na dokumencie ma wyglądać jednakowo.
 * Polski zostaje taki, jak przyszedł — maska w polu i tak wymusza „00-000".
 */
function normalizePostalCode(value: string, locale: Locale): string {
  if (locale !== "uk") return value.trim();

  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  return compact.length >= 5 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

/** Wzorzec zapisu znormalizowanego. Brytyjski jest ten sam, co w formularzach GOV.UK. */
const POSTAL_CODE_PATTERN: Record<Locale, RegExp> = {
  pl: /^\d{2}-\d{3}$/,
  uk: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
};

/**
 * Kod pocztowy.
 *
 * Polski to pięć cyfr z myślnikiem. Brytyjski jest alfanumeryczny, ma od pięciu
 * do siedmiu znaków i stałą część końcową „cyfra + dwie litery" — to nie jest
 * ta sama reguła z innym komunikatem, tylko inny format danych.
 *
 * Jeden schemat z podmienianym wzorcem, a nie dwa osobne zwracane warunkiem:
 * ternary z dwóch różnie zbudowanych schematów gubi TypeScriptowi typ wyjściowy
 * i cały rekord robi się `unknown` dopiero przy zapisie do bazy.
 */
export const postalCodeSchema = (context: ValidationContext) =>
  z
    .string()
    .transform((value) => normalizePostalCode(value, context.locale))
    .refine((value) => POSTAL_CODE_PATTERN[context.locale].test(value), {
      message: v(context).postalCode,
    });

/** Kod pocztowy opcjonalny — puste pole daje NULL, nie błąd formatu. */
export const optionalPostalCode = (context: ValidationContext) =>
  z
    .union([z.literal(""), postalCodeSchema(context)])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Telefon opcjonalny: cyfry, spacje, +, myślniki i nawiasy. Formatu nie
 * narzucamy — numer bywa zagraniczny, a do wybrania go i tak potrzebny jest
 * człowiek, nie parser.
 *
 * Puste pole musi być osobnym wariantem unii: regex wymaga min. 6 znaków,
 * więc „" odpadałoby, zanim transformacja zdążyłaby zamienić je na null.
 *
 * Jedna definicja na najemcę, właściciela i administrację budynku — trzy kopie
 * tej samej reguły rozjechałyby się przy pierwszej poprawce komunikatu.
 */
export const optionalPhone = (context: ValidationContext) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[+()\d\s-]{6,24}$/, v(context).phone),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/** E-mail opcjonalny — puste pole daje NULL, nie błąd formatu. */
export const optionalEmail = (context: ValidationContext) =>
  z
    .union([z.literal(""), emailSchema(context.d.auth.validation)])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Identyfikator podatkowy wystawcy — opcjonalny w obu krajach.
 *
 * Polska: NIP, dziesięć cyfr. Sumy kontrolnej celowo nie liczymy — literówka
 * w cyfrze kontrolnej zdarza się rzadziej niż firma, której NIP jej nie
 * przechodzi z powodu naszego błędu.
 *
 * Wielka Brytania: numer VAT, dziewięć cyfr z opcjonalnym „GB". Najem
 * mieszkaniowy jest z VAT zwolniony, więc większość wynajmujących nie ma tu
 * czego wpisać i pole zwyczajnie zostaje puste.
 *
 * Myślniki i spacje usuwamy przed sprawdzeniem: ludzie przepisują numer
 * z pieczątki w zapisie 123-456-32-18, a w bazie ma leżeć sam ciąg cyfr.
 */
export const optionalTaxId = (context: ValidationContext) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .transform((value) => value.replace(/[\s-]/g, "").replace(/^GB/i, ""))
        .pipe(z.string().regex(context.locale === "uk" ? /^\d{9}$/ : /^\d{10}$/, v(context).taxId)),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Rachunek, na który wpływa czynsz — opcjonalny.
 *
 * Polska: 26 cyfr IBAN-u, z opcjonalnym prefiksem „PL". Wielka Brytania:
 * sort code (6 cyfr) i numer konta (8), razem 14 cyfr — tam nikt nie podaje
 * IBAN-u do przelewu krajowego.
 *
 * Spacje i myślniki usuwamy przed sprawdzeniem: ludzie przepisują numer
 * w grupach i tak też go wklejają.
 *
 * Sumy kontrolnej nie liczymy: przelew i tak wykonuje człowiek w banku, który
 * sprawdzi ją porządnie, a fałszywy alarm na poprawnym numerze zablokowałby
 * zapis.
 */
export const optionalBankAccount = (context: ValidationContext) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .transform((value) => value.replace(/[\s-]/g, "").replace(/^PL/i, ""))
        .pipe(z.string().regex(context.locale === "uk" ? /^\d{14}$/ : /^\d{26}$/, v(context).bankAccount)),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Kwota wpisana przez człowieka → grosze (albo pensy).
 *
 * Formularz wysyła tekst („2 400,50"), bo `<input type="number">` z polskim
 * przecinkiem zachowuje się różnie w zależności od przeglądarki i ustawień
 * regionalnych. Parsujemy sami i mamy jeden wynik wszędzie.
 *
 * Parser dostaje kraj, bo separator dziesiętny jest w obu odwrotny: „1,234.56"
 * to po brytyjsku tysiąc dwieście, a po polsku ten zapis znaczy co innego.
 */
export const moneyInput = (context: ValidationContext, label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      if (typeof value === "number") return Math.round(value * 100);

      const parsed = parseMoney(value, context.locale);
      if (parsed === null) {
        ctx.addIssue({ code: "custom", message: fill(v(context).money, { label }) });
        return z.NEVER;
      }
      return parsed;
    })
    .refine((grosze) => grosze >= 0, { message: fill(v(context).moneyNegative, { label }) })
    .refine((grosze) => grosze <= 2_000_000_00, {
      message: fill(v(context).moneyTooHigh, { label }),
    });

/**
 * Kwota opcjonalna: puste pole, `null` i brak klucza dają `null`.
 *
 * Osobny wariant, bo `moneyInput(...).nullable().optional()` NIE przyjmuje
 * pustego stringa — a formularz wysyła właśnie `""`, gdy użytkownik nic nie
 * wpisał. Parser kwoty odrzucał to jako „nie jest kwotą".
 */
export const optionalMoneyInput = (context: ValidationContext, label: string) =>
  z
    .union([z.literal(""), z.null(), moneyInput(context, label)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));

/** Liczba dziesiętna w zapisie lokalnym („48,50" / „48.50") → string dla Decimal. */
export const decimalInput = (
  context: ValidationContext,
  label: string,
  options: { max: number; scale: number },
) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    const raw = typeof value === "number" ? String(value) : value.trim().replace(",", ".");
    const parsed = Number(raw);

    if (raw === "" || !Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: fill(v(context).notNumber, { label }) });
      return z.NEVER;
    }
    if (parsed < 0) {
      ctx.addIssue({ code: "custom", message: fill(v(context).moneyNegative, { label }) });
      return z.NEVER;
    }
    if (parsed > options.max) {
      ctx.addIssue({ code: "custom", message: fill(v(context).tooHigh, { label, max: options.max }) });
      return z.NEVER;
    }
    // Prisma przyjmuje string dla Decimal — bez konwersji przez Float
    // nie tracimy precyzji po drodze.
    return parsed.toFixed(options.scale);
  });

/**
 * Liczba dziesiętna opcjonalna — puste pole daje `null`.
 * Musi stać PO `decimalInput`: wywołuje je od razu przy tworzeniu unii,
 * więc odwołanie w górę pliku wywróciłoby moduł przy imporcie.
 */
export const optionalDecimalInput = (
  context: ValidationContext,
  label: string,
  options: { max: number; scale: number },
) =>
  z
    .union([z.literal(""), z.null(), decimalInput(context, label, options)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));

/** Pole liczbowe całkowite, opcjonalne (pokoje, piętro). */
export const optionalInt = (
  context: ValidationContext,
  label: string,
  options: { min: number; max: number },
) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;

      const parsed = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isInteger(parsed)) {
        ctx.addIssue({ code: "custom", message: fill(v(context).notInteger, { label }) });
        return z.NEVER;
      }
      if (parsed < options.min || parsed > options.max) {
        ctx.addIssue({
          code: "custom",
          message: fill(v(context).outOfRange, { label, min: options.min, max: options.max }),
        });
        return z.NEVER;
      }
      return parsed;
    });

/** Identyfikator rekordu z URL-a. */
export const idSchema = (context: ValidationContext) => z.string().min(1, v(context).missingId).max(64);

/**
 * Data z pola `<input type="date">` („2026-09-01") → Date w północy UTC.
 *
 * `new Date("2026-09-01")` też daje północ UTC, ale `new Date(2026, 8, 1)`
 * dałoby północ czasu lokalnego — a wtedy ta sama umowa zaczynałaby się
 * dzień wcześniej dla serwera w innej strefie. Budujemy datę jawnie z części.
 */
export const dateInput = (context: ValidationContext, label: string) =>
  z.union([z.string(), z.date()]).transform((value, ctx) => {
    if (value instanceof Date) {
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      ctx.addIssue({ code: "custom", message: fill(v(context).dateFormat, { label }) });
      return z.NEVER;
    }

    const [, year, month, day] = match.map(Number) as [never, number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));

    // Odsiewa daty typu 2026-02-31, które Date po cichu przesuwa na marzec.
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      ctx.addIssue({ code: "custom", message: fill(v(context).dateInvalid, { label }) });
      return z.NEVER;
    }

    return date;
  });

/**
 * Data opcjonalna — puste pole daje null (np. umowa na czas nieokreślony).
 *
 * `.optional()` musi stać na unii, a nie w jej wnętrzu: `z.undefined()` jako
 * wariant unii sprawia, że klucz nadal jest wymagany w obiekcie, więc
 * pominięcie pola wywracało walidację całego formularza.
 */
export const optionalDateInput = (context: ValidationContext, label: string) =>
  z
    .union([z.literal(""), z.null(), dateInput(context, label)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));
