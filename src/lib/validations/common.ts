import { z } from "zod";

import { parsePLN } from "@/lib/money";

import { getDictionary } from "@/lib/i18n";

import { emailSchema } from "./auth";

const t = getDictionary("pl").auth.validation;

/**
 * Bloki wspólne dla formularzy i API routes. Ta sama definicja po obu stronach —
 * komunikaty nie rozjeżdżają się między walidacją w przeglądarce a serwerem.
 */

/** Pole tekstowe, które po przycięciu może być puste → zapisujemy NULL. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksymalnie ${max} znaków`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Etykiety mają różny rodzaj gramatyczny („Nazwa" żeński, „Numer" męski,
 * „Oznaczenie" nijaki), więc komunikat nie może odmieniać się razem z nimi.
 * „Pole …" jest nijakie i uzgadnia się z każdą etykietą.
 */
export const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Pole „${label}” jest wymagane`)
    .max(max, `Maksymalnie ${max} znaków`);

/** Polski kod pocztowy: 30-001. */
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000");

/** Kod pocztowy opcjonalny — puste pole daje NULL, nie błąd formatu. */
export const optionalPostalCode = z
  .union([z.literal(""), postalCodeSchema])
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
export const optionalPhone = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[+()\d\s-]{6,24}$/, "Numer telefonu wygląda nieprawidłowo"),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/** E-mail opcjonalny — puste pole daje NULL, nie błąd formatu. */
export const optionalEmail = z
  .union([z.literal(""), emailSchema(t)])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * NIP opcjonalny — ten sam po stronie najemcy (nabywca) i organizacji
 * (sprzedawca), więc definicja stoi tu, a nie w dwóch miejscach osobno.
 *
 * Myślniki i spacje usuwamy przed sprawdzeniem długości: ludzie przepisują NIP
 * z pieczątki w zapisie 123-456-32-18, a w bazie ma leżeć dziesięć cyfr.
 * Sumy kontrolnej celowo nie liczymy — literówka w cyfrze kontrolnej zdarza się
 * rzadziej niż firma, której NIP jej nie przechodzi z powodu naszego błędu.
 */
export const optionalTaxId = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\d{10}$/, "NIP składa się z 10 cyfr")),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * Polski numer rachunku: 26 cyfr, z opcjonalnym prefiksem PL.
 *
 * Spacje usuwamy przed sprawdzeniem — ludzie przepisują numer z umowy
 * w grupach po cztery i tak też go wklejają.
 *
 * Sumy kontrolnej IBAN nie liczymy: przelew i tak wykonuje człowiek w banku,
 * który sprawdzi ją porządnie, a fałszywy alarm na poprawnym numerze
 * zablokowałby zapis.
 *
 * Wspólne dla właściciela (rachunek, na który przekazujemy czynsz) i wystawcy
 * (rachunek, na który wpłaca najemca) — dwie kopie tej samej reguły rozjechałyby
 * się przy pierwszej poprawce komunikatu.
 */
export const optionalBankAccount = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/\s/g, "").replace(/^PL/i, ""))
      .pipe(z.string().regex(/^\d{26}$/, "Numer rachunku to 26 cyfr")),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * Kwota wpisana przez człowieka → grosze.
 *
 * Formularz wysyła tekst („2 400,50"), bo `<input type="number">` z polskim
 * przecinkiem zachowuje się różnie w zależności od przeglądarki i ustawień
 * regionalnych. Parsujemy sami i mamy jeden wynik wszędzie.
 */
export const moneyInput = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      if (typeof value === "number") return Math.round(value * 100);

      const parsed = parsePLN(value);
      if (parsed === null) {
        ctx.addIssue({ code: "custom", message: `${label} musi być kwotą, np. 2 400,50` });
        return z.NEVER;
      }
      return parsed;
    })
    .refine((grosze) => grosze >= 0, { message: `${label} nie może być ujemna` })
    .refine((grosze) => grosze <= 2_000_000_00, {
      message: `${label} wygląda na zawyżoną`,
    });

/**
 * Kwota opcjonalna: puste pole, `null` i brak klucza dają `null`.
 *
 * Osobny wariant, bo `moneyInput(...).nullable().optional()` NIE przyjmuje
 * pustego stringa — a formularz wysyła właśnie `""`, gdy użytkownik nic nie
 * wpisał. Parser kwoty odrzucał to jako „nie jest kwotą".
 */
export const optionalMoneyInput = (label: string) =>
  z
    .union([z.literal(""), z.null(), moneyInput(label)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));

/** Liczba dziesiętna w polskim zapisie („48,50") → string dla kolumny Decimal. */
export const decimalInput = (label: string, options: { max: number; scale: number }) =>
  z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      const raw = typeof value === "number" ? String(value) : value.trim().replace(",", ".");
      const parsed = Number(raw);

      if (raw === "" || !Number.isFinite(parsed)) {
        ctx.addIssue({ code: "custom", message: `${label} musi być liczbą` });
        return z.NEVER;
      }
      if (parsed < 0) {
        ctx.addIssue({ code: "custom", message: `${label} nie może być ujemna` });
        return z.NEVER;
      }
      if (parsed > options.max) {
        ctx.addIssue({ code: "custom", message: `${label} nie może przekraczać ${options.max}` });
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
export const optionalDecimalInput = (label: string, options: { max: number; scale: number }) =>
  z
    .union([z.literal(""), z.null(), decimalInput(label, options)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));

/** Pole liczbowe całkowite, opcjonalne (pokoje, piętro). */
export const optionalInt = (label: string, options: { min: number; max: number }) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;

      const parsed = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isInteger(parsed)) {
        ctx.addIssue({ code: "custom", message: `${label} musi być liczbą całkowitą` });
        return z.NEVER;
      }
      if (parsed < options.min || parsed > options.max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} musi mieścić się w zakresie ${options.min}–${options.max}`,
        });
        return z.NEVER;
      }
      return parsed;
    });

/** Identyfikator rekordu z URL-a. */
export const idSchema = z.string().min(1, "Brak identyfikatora").max(64);

/**
 * Data z pola `<input type="date">` („2026-09-01") → Date w północy UTC.
 *
 * `new Date("2026-09-01")` też daje północ UTC, ale `new Date(2026, 8, 1)`
 * dałoby północ czasu lokalnego — a wtedy ta sama umowa zaczynałaby się
 * dzień wcześniej dla serwera w innej strefie. Budujemy datę jawnie z części.
 */
export const dateInput = (label: string) =>
  z.union([z.string(), z.date()]).transform((value, ctx) => {
    if (value instanceof Date) {
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      ctx.addIssue({ code: "custom", message: `${label}: podaj datę w formacie RRRR-MM-DD` });
      return z.NEVER;
    }

    const [, year, month, day] = match.map(Number) as [never, number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));

    // Odsiewa daty typu 2026-02-31, które Date po cichu przesuwa na marzec.
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      ctx.addIssue({ code: "custom", message: `${label}: taka data nie istnieje` });
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
export const optionalDateInput = (label: string) =>
  z
    .union([z.literal(""), z.null(), dateInput(label)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value));
