import { z } from "zod";

import { unknownVariables } from "@/lib/email/render";
import { EDITABLE_NOTIFICATION_TYPES } from "@/lib/notifications/types";

import { emailSchema, passwordSchema } from "./auth";
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
  /**
   * Adres, pod który odpisze najemca.
   *
   * Nie jest to adres nadawcy — wiadomości wychodzą z domeny platformy, bo tylko
   * ona ma rekordy SPF i DKIM. Ten trafia do nagłówka Reply-To, więc odpowiedź
   * idzie do wynajmującego, a nie do platformy.
   */
  contactEmail: z
    .union([z.literal(""), emailSchema])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  taxId: optionalTaxId,
  street: optionalText(120),
  postalCode: optionalPostalCode,
  city: optionalText(80),
});

export type OrganizationSettingsInput = z.input<typeof organizationSettingsSchema>;
export type OrganizationSettingsOutput = z.output<typeof organizationSettingsSchema>;

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

export const organizationLogoSchema = z.object({
  dataUrl: z
    .string()
    .max(MAX_LOGO_BYTES * 2, "Plik jest za duży")
    .superRefine((value, ctx) => {
      const match = DATA_URL_PATTERN.exec(value);

      if (!match) {
        ctx.addIssue({ code: "custom", message: "Wgraj obrazek PNG albo JPEG" });
        return;
      }
      if (base64Bytes(match[2] as string) > MAX_LOGO_BYTES) {
        ctx.addIssue({
          code: "custom",
          message: `Obrazek może ważyć najwyżej ${Math.round(MAX_LOGO_BYTES / 1024)} kB`,
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

export type OrganizationLogoInput = z.input<typeof organizationLogoSchema>;
export type OrganizationLogoOutput = z.output<typeof organizationLogoSchema>;

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

/**
 * Rytm przypominania i nazwa nadawcy.
 *
 * Granice nie są dekoracją. Dolna przy ponawianiu wezwań bierze się stąd, że
 * codzienna wiadomość o tej samej zaległości trafia do spamu i przestaje
 * docierać — ustawienie „co 1 dzień" zaszkodziłoby temu, kto je wybierze.
 * Górna przy przypomnieniu przed terminem: powyżej miesiąca dokument zwykle
 * jeszcze nie istnieje, więc przypominać nie ma o czym.
 */
export const notificationSettingsSchema = z.object({
  senderName: optionalText(120),
  reminderDaysBefore: z.coerce
    .number()
    .int("Podaj pełne dni")
    .min(1, "Przypomnienie musi wyprzedzać termin o co najmniej dzień")
    .max(30, "Więcej niż 30 dni przed terminem to za wcześnie"),
  overdueRepeatDays: z.coerce
    .number()
    .int("Podaj pełne dni")
    .min(2, "Codzienne wezwania trafiają do spamu — ustaw co najmniej 2 dni")
    .max(60, "Rzadziej niż co 60 dni wezwanie przestaje być wezwaniem"),
});

export type NotificationSettingsInput = z.input<typeof notificationSettingsSchema>;
export type NotificationSettingsOutput = z.output<typeof notificationSettingsSchema>;

/**
 * Pole treści pisanej przez wynajmującego.
 *
 * Puste zapisujemy jako NULL, bo NULL znaczy „użyj domyślnego tekstu z kodu".
 * Gdyby puste pole zapisywało pusty string, wyczyszczenie akapitu wysyłałoby
 * najemcy wiadomość z dziurą zamiast przywracać tekst domyślny — a to jest to,
 * czego ktoś kasujący zawartość pola się spodziewa.
 */
const templateField = (max: number) =>
  optionalText(max).superRefine((value, ctx) => {
    const unknown = value ? unknownVariables(value) : [];
    if (unknown.length === 0) return;

    // Wypisujemy nazwy, a nie samo „nieznana zmienna": literówka bywa
    // jednoliterowa i bez pokazania winowajcy szuka się jej na oko.
    ctx.addIssue({
      code: "custom",
      message: `Nieznane zmienne: ${unknown
        .map((name) => `{{${name}}}`)
        .join(", ")}. Sprawdź listę pod polem.`,
    });
  });

/**
 * Treść jednego rodzaju powiadomienia.
 *
 * Temat jest krótszy niż reszta nie dla porządku: klienci pocztowi ucinają go
 * po kilkudziesięciu znakach, a temat ucięty w połowie kwoty jest gorszy niż
 * temat krótki.
 */
export const emailTemplateSchema = z.object({
  type: z.enum(EDITABLE_NOTIFICATION_TYPES),
  enabled: z.boolean(),
  subject: templateField(160),
  heading: templateField(60),
  intro: templateField(1200),
  outro: templateField(1200),
});

export type EmailTemplateInput = z.input<typeof emailTemplateSchema>;
export type EmailTemplateOutput = z.output<typeof emailTemplateSchema>;
