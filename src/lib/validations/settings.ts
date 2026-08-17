import { z } from "zod";

import { passwordSchema } from "./auth";
import { optionalPostalCode, optionalTaxId, optionalText, requiredText } from "./common";

/**
 * Ustawienia konta: dane wystawcy dokumentów i profil użytkownika.
 */

/**
 * Dane organizacji — sprzedawca na fakturze i wynajmujący na umowie.
 *
 * Adres i NIP są w bazie opcjonalne, bo rejestracja pyta tylko o nazwę i konto
 * musi powstać w jednym kroku. Formalnie na rachunku powinny być, dlatego
 * `isSellerComplete` w serwisie pilnuje, żeby panel o nie przypomniał —
 * ale walidacja ich nie wymusza, inaczej nie dałoby się zapisać częściowo
 * uzupełnionego formularza.
 */
export const organizationSettingsSchema = z.object({
  name: requiredText("Nazwa", 120),
  taxId: optionalTaxId,
  street: optionalText(120),
  postalCode: optionalPostalCode,
  city: optionalText(80),
});

export type OrganizationSettingsInput = z.input<typeof organizationSettingsSchema>;
export type OrganizationSettingsOutput = z.output<typeof organizationSettingsSchema>;

/**
 * Profil użytkownika.
 *
 * E-maila nie ma na liście: jest loginem i identyfikatorem sesji, więc jego
 * zmiana wymaga potwierdzenia nowego adresu — inaczej literówka odcina od konta.
 * To osobny przepływ, nie pole w formularzu ustawień.
 */
export const profileSettingsSchema = z.object({
  name: requiredText("Imię i nazwisko", 120),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[+()\d\s-]{6,24}$/, "Numer telefonu wygląda nieprawidłowo"),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export type ProfileSettingsInput = z.input<typeof profileSettingsSchema>;
export type ProfileSettingsOutput = z.output<typeof profileSettingsSchema>;

/**
 * Zmiana hasła.
 *
 * Obecne hasło jest wymagane mimo aktywnej sesji: gdyby ktoś dorwał się do
 * niezablokowanego komputera, bez tego warunku przejąłby konto jednym
 * formularzem.
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Podaj obecne hasło"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Nowe hasło musi różnić się od obecnego",
    path: ["newPassword"],
  });

export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;
export type PasswordChangeOutput = z.output<typeof passwordChangeSchema>;

/** Frazę trzeba przepisać ręcznie — kliknięcie „tak" idzie odruchowo. */
export const ACCOUNT_DELETE_PHRASE = "USUWAM KONTO";

/**
 * Usunięcie konta.
 *
 * Dwie bariery, bo operacja jest nieodwracalna i zabiera ze sobą całą
 * organizację: hasło (potwierdza, że to właściciel siedzi przy komputerze)
 * i przepisana frazа (potwierdza, że rozumie, co klika).
 */
export const accountDeleteSchema = z.object({
  currentPassword: z.string().min(1, "Podaj hasło, żeby potwierdzić"),
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === ACCOUNT_DELETE_PHRASE, {
      message: `Przepisz dokładnie: ${ACCOUNT_DELETE_PHRASE}`,
    }),
});

export type AccountDeleteInput = z.input<typeof accountDeleteSchema>;
export type AccountDeleteOutput = z.output<typeof accountDeleteSchema>;
