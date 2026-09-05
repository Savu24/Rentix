import { z } from "zod";

import { unknownVariables } from "@/lib/email/render";
import { EDITABLE_NOTIFICATION_TYPES } from "@/lib/notifications/types";

import { fill } from "@/lib/i18n/format";

import { emailSchema, passwordSchema } from "./auth";
import {
  type ValidationContext,
  optionalBankAccount,
  optionalPostalCode,
  optionalTaxId,
  optionalText,
  requiredText,
} from "./common";

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
export const organizationSettingsSchema = (c: ValidationContext) =>
  z.object({
    name: requiredText(c, c.d.panel.settings.fields.organizationName, 120),
  /**
   * Adres, pod który odpisze najemca.
   *
   * Nie jest to adres nadawcy — wiadomości wychodzą z domeny platformy, bo tylko
   * ona ma rekordy SPF i DKIM. Ten trafia do nagłówka Reply-To, więc odpowiedź
   * idzie do wynajmującego, a nie do platformy.
   */
  contactEmail: z
    .union([z.literal(""), emailSchema(c.d.auth.validation)])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
    taxId: optionalTaxId(c),
    street: optionalText(c, 120),
    postalCode: optionalPostalCode(c),
    city: optionalText(c, 80),
  /**
   * Rachunek, na który najemca ma wpłacić.
   *
   * Opcjonalny jak reszta danych wystawcy — przy gotówce albo przy rozliczeniu
   * przez pośrednika nie ma czego wpisywać, a dokument bez tej linii wygląda
   * dokładnie tak, jak przed dołożeniem pola.
   */
    bankAccount: optionalBankAccount(c),
  });

export type OrganizationSettingsInput = z.input<ReturnType<typeof organizationSettingsSchema>>;
export type OrganizationSettingsOutput = z.output<ReturnType<typeof organizationSettingsSchema>>;

/**
 * Logo wystawcy — nieobowiązkowe. Bez niego dokument wygląda dokładnie tak,
 * jak dotąd, więc nic tu nie jest wymagane poza formatem samego pliku.
 *
 * PNG i JPEG, bo tylko te formaty rysuje renderer PDF-a. SVG ani WebP nie
 * zgłoszą błędu — po prostu nie pojawią się na dokumencie, a to gorsze niż
 * odmowa przy wgrywaniu.
 */
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg"] as const;

/**
 * 300 kB na obrazek. Logo to zwykle kilkadziesiąt kilobajtów; większy plik
 * znaczy zdjęcie z telefonu, które i tak zostanie zmniejszone do paska
 * nagłówka, a wagę PDF-a podniesie realnie.
 */
export const MAX_LOGO_BYTES = 300 * 1024;

const DATA_URL_PATTERN = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+=*)$/;

/** Ile bajtów waży zakodowany base64 — bez dekodowania całości do pamięci. */
function base64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const organizationLogoSchema = (c: ValidationContext) =>
  z.object({
    dataUrl: z
    .string()
    .max(MAX_LOGO_BYTES * 2, c.d.panel.settings.logoTooLarge)
    .superRefine((value, ctx) => {
      const match = DATA_URL_PATTERN.exec(value);

      if (!match) {
        ctx.addIssue({ code: "custom", message: c.d.panel.settings.logoWrongType });
        return;
      }
      if (base64Bytes(match[2] as string) > MAX_LOGO_BYTES) {
        ctx.addIssue({
          code: "custom",
          message: fill(c.d.panel.settings.logoMaxSize, {
            kb: Math.round(MAX_LOGO_BYTES / 1024),
          }),
        });
      }
    })
    // Typ bierzemy z samego data URI, a nie z pola obok: klient mógłby podać
    // dowolny, a zapisany rozjazd wyszedłby dopiero przy renderowaniu PDF-a.
    .transform((value) => ({
      dataUrl: value,
      mimeType: (DATA_URL_PATTERN.exec(value)?.[1] ?? "image/png") as string,
    })),
  });

export type OrganizationLogoInput = z.input<ReturnType<typeof organizationLogoSchema>>;
export type OrganizationLogoOutput = z.output<ReturnType<typeof organizationLogoSchema>>;

/**
 * Profil użytkownika.
 *
 * E-maila nie ma na liście: jest loginem i identyfikatorem sesji, więc jego
 * zmiana wymaga potwierdzenia nowego adresu — inaczej literówka odcina od konta.
 * To osobny przepływ, nie pole w formularzu ustawień.
 */
export const profileSettingsSchema = (c: ValidationContext) =>
  z.object({
    name: requiredText(c, c.d.panel.settings.fields.userName, 120),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[+()\d\s-]{6,24}$/, c.d.panel.settings.phoneInvalid),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  });

export type ProfileSettingsInput = z.input<ReturnType<typeof profileSettingsSchema>>;
export type ProfileSettingsOutput = z.output<ReturnType<typeof profileSettingsSchema>>;

/**
 * Zmiana hasła.
 *
 * Obecne hasło jest wymagane mimo aktywnej sesji: gdyby ktoś dorwał się do
 * niezablokowanego komputera, bez tego warunku przejąłby konto jednym
 * formularzem.
 */
export const passwordChangeSchema = (c: ValidationContext) =>
  z
    .object({
      currentPassword: z.string().min(1, c.d.panel.settings.currentPasswordRequired),
      newPassword: passwordSchema(c.d.auth.validation),
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: c.d.panel.settings.newPasswordSame,
      path: ["newPassword"],
    });

export type PasswordChangeInput = z.input<ReturnType<typeof passwordChangeSchema>>;
export type PasswordChangeOutput = z.output<ReturnType<typeof passwordChangeSchema>>;

/**
 * Frazę trzeba przepisać ręcznie — kliknięcie „tak" idzie odruchowo.
 *
 * Siedzi w słowniku, bo przepisywanie polskiego zdania w angielskim panelu
 * byłoby zagadką, a nie potwierdzeniem.
 */
export const accountDeletePhrase = (c: ValidationContext) => c.d.panel.settings.deletePhrase;

/**
 * Usunięcie konta.
 *
 * Dwie bariery, bo operacja jest nieodwracalna i zabiera ze sobą całą
 * organizację: hasło (potwierdza, że to właściciel siedzi przy komputerze)
 * i przepisana frazа (potwierdza, że rozumie, co klika).
 */
export const accountDeleteSchema = (c: ValidationContext) =>
  z.object({
    currentPassword: z.string().min(1, c.d.panel.settings.passwordToConfirm),
    confirmation: z
      .string()
      .trim()
      .refine((value) => value === accountDeletePhrase(c), {
        message: fill(c.d.panel.settings.deleteConfirmation, {
          phrase: accountDeletePhrase(c),
        }),
      }),
  });

export type AccountDeleteInput = z.input<ReturnType<typeof accountDeleteSchema>>;
export type AccountDeleteOutput = z.output<ReturnType<typeof accountDeleteSchema>>;

/**
 * Rytm przypominania i nazwa nadawcy.
 *
 * Granice nie są dekoracją. Dolna przy ponawianiu wezwań bierze się stąd, że
 * codzienna wiadomość o tej samej zaległości trafia do spamu i przestaje
 * docierać — ustawienie „co 1 dzień" zaszkodziłoby temu, kto je wybierze.
 * Górna przy przypomnieniu przed terminem: powyżej miesiąca dokument zwykle
 * jeszcze nie istnieje, więc przypominać nie ma o czym.
 */
export const notificationSettingsSchema = (c: ValidationContext) =>
  z.object({
    senderName: optionalText(c, 120),
    reminderDaysBefore: z.coerce
      .number()
      .int(c.d.panel.settings.wholeDays)
      .min(1, c.d.panel.settings.reminderTooLate)
      .max(30, c.d.panel.settings.reminderTooEarly),
    overdueRepeatDays: z.coerce
      .number()
      .int(c.d.panel.settings.wholeDays)
      .min(2, c.d.panel.settings.overdueTooOften)
      .max(60, c.d.panel.settings.overdueTooRare),
  });

export type NotificationSettingsInput = z.input<ReturnType<typeof notificationSettingsSchema>>;
export type NotificationSettingsOutput = z.output<ReturnType<typeof notificationSettingsSchema>>;

/**
 * Pole treści pisanej przez wynajmującego.
 *
 * Puste zapisujemy jako NULL, bo NULL znaczy „użyj domyślnego tekstu z kodu".
 * Gdyby puste pole zapisywało pusty string, wyczyszczenie akapitu wysyłałoby
 * najemcy wiadomość z dziurą zamiast przywracać tekst domyślny — a to jest to,
 * czego ktoś kasujący zawartość pola się spodziewa.
 */
const templateField = (c: ValidationContext, max: number) =>
  optionalText(c, max).superRefine((value, ctx) => {
    const unknown = value ? unknownVariables(value, c.d) : [];
    if (unknown.length === 0) return;

    // Wypisujemy nazwy, a nie samo „nieznana zmienna": literówka bywa
    // jednoliterowa i bez pokazania winowajcy szuka się jej na oko.
    ctx.addIssue({
      code: "custom",
      message: fill(c.d.panel.settings.unknownVariables, {
        names: unknown.map((name) => `{{${name}}}`).join(", "),
      }),
    });
  });

/**
 * Treść jednego rodzaju powiadomienia.
 *
 * Temat jest krótszy niż reszta nie dla porządku: klienci pocztowi ucinają go
 * po kilkudziesięciu znakach, a temat ucięty w połowie kwoty jest gorszy niż
 * temat krótki.
 */
export const emailTemplateSchema = (c: ValidationContext) =>
  z.object({
    type: z.enum(EDITABLE_NOTIFICATION_TYPES),
    enabled: z.boolean(),
    subject: templateField(c, 160),
    heading: templateField(c, 60),
    intro: templateField(c, 1200),
    outro: templateField(c, 1200),
  });

export type EmailTemplateInput = z.input<ReturnType<typeof emailTemplateSchema>>;
export type EmailTemplateOutput = z.output<ReturnType<typeof emailTemplateSchema>>;
