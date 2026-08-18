import { formatPLN } from "@/lib/money";

import type { EmailContent } from "./client";
import { escapeHtml, renderField, textToHtml, type TemplateValues } from "./render";

/**
 * Szablony wiadomości do najemcy.
 *
 * HTML ze stylami wpisanymi w atrybut `style`: klienci pocztowi (Outlook,
 * Gmail w aplikacji) wycinają `<style>` z nagłówka, więc arkusz zewnętrzny
 * ani klasy nie zadziałają. Układ oparty na tabeli z tego samego powodu.
 *
 * Kolory są przepisane z design systemu jako literały — e-mail nie ma dostępu
 * do zmiennych CSS aplikacji.
 *
 * Teksty poniżej są **domyślne**. Wynajmujący może nadpisać temat, nadpis
 * i dwa akapity własnymi (model `EmailTemplate`); brak wpisu zostawia to, co
 * tutaj. Domyślek nie kopiujemy do bazy przy zakładaniu konta — inaczej
 * poprawka literówki nie dotarłaby do kont założonych wcześniej.
 */

const COLORS = {
  ink: "#16301D",
  muted: "#6B7266",
  accent: "#1B4D3E",
  bad: "#A33A2E",
  surface: "#FFFFFF",
  page: "#F7F4EE",
  rule: "#DED2B8",
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export type InvoiceEmailData = {
  tenantFirstName: string;
  landlordName: string;
  invoiceNumber: string;
  amountGrosze: number;
  remainingGrosze: number;
  dueDate: Date;
  periodLabel: string | null;
  /** Czy PDF dokumentu jedzie w załączniku — decyduje o treści wezwania. */
  attached: boolean;
  /** Do zmiennej `{{nazwisko_najemcy}}`; nieobowiązkowe, bo nie każdy wołający je ma. */
  tenantLastName?: string | null;
  /** Do zmiennej `{{adres_lokalu}}`; dokument jednorazowy nie ma umowy ani lokalu. */
  propertyAddress?: string | null;
};

/**
 * Teksty wpisane przez wynajmującego. Pole puste albo `null` znaczy „zostaw
 * domyślne", więc częściowo wypełniony szablon działa: można zmienić sam temat
 * i nie tknąć reszty.
 */
export type TemplateFields = {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
  outro?: string | null;
};

/** Wartości zmiennych dostępnych w treści pisanej przez wynajmującego. */
export function templateValues(
  data: InvoiceEmailData,
  overdueDaysCount = 0,
): TemplateValues {
  return {
    imie_najemcy: data.tenantFirstName,
    nazwisko_najemcy: data.tenantLastName ?? "",
    nazwa_wynajmujacego: data.landlordName,
    numer_dokumentu: data.invoiceNumber,
    kwota: formatPLN(data.amountGrosze),
    do_zaplaty: formatPLN(data.remainingGrosze),
    termin: dateFormat.format(data.dueDate),
    okres: data.periodLabel ?? "",
    dni_po_terminie: String(overdueDaysCount),
    adres_lokalu: data.propertyAddress ?? "",
  };
}

/**
 * Składa ramę wiadomości.
 *
 * `heading`, `intro` i `outro` przychodzą jako **zwykły tekst** i dopiero tutaj
 * stają się HTML-em. To jedyne miejsce, w którym wolno je zamienić: treść bywa
 * pisana przez wynajmującego, a imię najemcy pochodzi z bazy — jedno „Kowalski
 * & Wspólnicy" bez escapowania psuje wiadomość u odbiorcy, a znacznik wklejony
 * w pole edytora psuje ją znacznie skuteczniej.
 */
function layout(options: {
  heading: string;
  accentColor: string;
  intro: string;
  rows: Array<[string, string]>;
  outro: string;
  attached: boolean;
  landlordName: string;
}): string {
  const rows = options.rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:${COLORS.muted};font-size:14px;">${label}</td>
          <td style="padding:6px 0;color:${COLORS.ink};font-size:14px;font-weight:600;text-align:right;">${value}</td>
        </tr>`,
    )
    .join("");

  /*
    Bez przycisku do panelu.

    Wcześniej wiadomość prowadziła do `/panel/finanse/...`, czyli do panelu
    właściciela — a najemca nie ma tam konta i lądował na ekranie logowania.
    Dokument jedzie teraz w załączniku, więc nie ma dokąd odsyłać.
  */
  const attachmentNote = options.attached
    ? `<p style="margin:20px 0 0;padding:10px 12px;background:${COLORS.page};border-radius:8px;
                 font-size:13.5px;color:${COLORS.ink};">
         Dokument w formacie PDF znajdziesz w załączniku tej wiadomości.
       </p>`
    : "";

  return `<!doctype html>
<html lang="pl">
  <head>
    <!--
      Deklaracja kodowania w samym dokumencie, mimo że nagłówek MIME wiadomości
      też je podaje. Część klientów pocztowych czyta HTML w oderwaniu od koperty
      (podgląd, przekazanie dalej, archiwum) i wtedy bez tej linijki polskie
      znaki rozsypują się na krzaki — „płatności" zamienia się w „pĹ‚atnoĹ›ci".
    -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:24px;background:${COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.surface};border:1px solid ${COLORS.rule};border-radius:14px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:${options.accentColor};font-weight:600;">
            ${escapeHtml(options.heading)}
          </p>
          <p style="margin:0;color:${COLORS.ink};font-size:15px;line-height:1.6;">${textToHtml(options.intro)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border-top:1px solid ${COLORS.rule};border-bottom:1px solid ${COLORS.rule};">
            ${rows}
          </table>
          ${attachmentNote}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 28px;">
          <p style="margin:0;color:${COLORS.muted};font-size:13px;line-height:1.6;">${textToHtml(options.outro)}</p>
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;">
            ${escapeHtml(options.landlordName)} · wiadomość wysłana automatycznie z systemu Rentix
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textVersion(lines: readonly (string | null)[]): string {
  return lines.filter((line): line is string => line !== null).join("\n");
}

/** Rodzaje wiadomości, które mają szablon — wyprowadzone z `DEFAULT_FIELDS`. */
export type EmailTemplateType = keyof typeof DEFAULT_FIELDS;

/**
 * Domyślne teksty rodzaju powiadomienia, przed nadpisaniem przez wynajmującego.
 */
export type Defaults = {
  subject: string;
  heading: string;
  intro: string;
  outro: string;
};

/**
 * Domyślne teksty w jednym miejscu.
 *
 * Panel pokazuje je jako podpowiedź w pustym polu edytora („tak wyjdzie, jeśli
 * nic nie wpiszesz"), a wysyłka używa ich, gdy pole jest puste. Gdyby każde
 * z tych miejsc trzymało własną kopię, podpowiedź w panelu obiecywałaby jedno,
 * a najemca dostawał drugie — i nikt by się nie zorientował, bo obie strony
 * wyglądałyby na poprawne.
 *
 * Są funkcjami danych, a nie stałymi, bo zdanie o okresie rozliczeniowym musi
 * zniknąć przy dokumencie jednorazowym, a liczba dni po terminie odmienia się
 * przez „dzień" i „dni".
 */
export const DEFAULT_FIELDS = {
  INVOICE_ISSUED: (data: InvoiceEmailData): Defaults => ({
    subject: `${data.invoiceNumber} — ${formatPLN(data.amountGrosze)} do ${dateFormat.format(data.dueDate)}`,
    heading: "Nowy dokument",
    intro: `Dzień dobry, ${data.tenantFirstName}. Wystawiliśmy dokument rozliczeniowy${
      data.periodLabel ? ` za ${data.periodLabel}` : ""
    }.`,
    outro: "Jeśli płatność została już wykonana, prosimy potraktować tę wiadomość jako informacyjną.",
  }),

  PAYMENT_REMINDER: (data: InvoiceEmailData): Defaults => ({
    subject: `Przypomnienie: ${data.invoiceNumber} — termin ${dateFormat.format(data.dueDate)}`,
    heading: "Zbliża się termin",
    intro: `Dzień dobry, ${data.tenantFirstName}. Przypominamy o zbliżającym się terminie płatności.`,
    outro: "Jeśli przelew jest już w drodze, prosimy zignorować tę wiadomość.",
  }),

  PAYMENT_OVERDUE: (data: InvoiceEmailData & { daysOverdue: number }): Defaults => ({
    subject: `Zaległość: ${data.invoiceNumber} — ${formatPLN(data.remainingGrosze)}`,
    heading: "Płatność po terminie",
    intro: `Dzień dobry, ${data.tenantFirstName}. Termin płatności minął ${data.daysOverdue} ${
      data.daysOverdue === 1 ? "dzień" : "dni"
    } temu, a wpłata nie została jeszcze odnotowana.`,
    outro:
      "Jeśli płatność została wykonana w ciągu ostatnich dni, prosimy o kontakt — sprawdzimy, czy wpłata do nas dotarła.",
  }),
};

/**
 * Łączy domyślny tekst z tym, co wpisał wynajmujący.
 *
 * Pole po polu, nie całość albo nic: typowa zmiana to sam temat albo samo
 * pożegnanie, a wymuszanie przepisania wszystkich czterech pól po to, żeby
 * zmienić jedno, kończy się porzuconym formularzem.
 */
function resolveFields(
  defaults: Defaults,
  fields: TemplateFields | null | undefined,
  values: TemplateValues,
): Defaults {
  return {
    subject: renderField(fields?.subject, values) ?? defaults.subject,
    heading: renderField(fields?.heading, values) ?? defaults.heading,
    intro: renderField(fields?.intro, values) ?? defaults.intro,
    outro: renderField(fields?.outro, values) ?? defaults.outro,
  };
}

/**
 * Wersja tekstowa wiadomości.
 *
 * Ma nieść to samo co HTML, łącznie z akapitem zamykającym: filtry
 * antyspamowe porównują obie wersje i rozjazd między nimi podbija punktację.
 */
function plainVersion(
  parts: Defaults,
  rows: Array<[string, string]>,
  data: InvoiceEmailData,
): string {
  return textVersion([
    parts.intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    data.attached ? "\nDokument PDF jest w załączniku tej wiadomości." : null,
    "",
    parts.outro,
    "",
    `${data.landlordName} · wiadomość wysłana automatycznie z systemu Rentix`,
  ]);
}

/** Wystawiono nowy dokument. */
export function invoiceIssuedEmail(
  data: InvoiceEmailData,
  fields?: TemplateFields | null,
): EmailContent {
  const values = templateValues(data);
  const parts = resolveFields(DEFAULT_FIELDS.INVOICE_ISSUED(data), fields, values);

  const rows: Array<[string, string]> = [
    ["Numer", data.invoiceNumber],
    ["Kwota", formatPLN(data.amountGrosze)],
    ["Termin płatności", dateFormat.format(data.dueDate)],
  ];

  return {
    subject: parts.subject,
    html: layout({
      heading: parts.heading,
      accentColor: COLORS.accent,
      intro: parts.intro,
      rows,
      outro: parts.outro,
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: plainVersion(parts, rows, data),
  };
}

/** Termin płatności się zbliża. */
export function paymentReminderEmail(
  data: InvoiceEmailData,
  fields?: TemplateFields | null,
): EmailContent {
  const values = templateValues(data);
  const parts = resolveFields(DEFAULT_FIELDS.PAYMENT_REMINDER(data), fields, values);

  const rows: Array<[string, string]> = [
    ["Numer", data.invoiceNumber],
    ["Do zapłaty", formatPLN(data.remainingGrosze)],
    ["Termin", dateFormat.format(data.dueDate)],
  ];

  return {
    subject: parts.subject,
    html: layout({
      heading: parts.heading,
      accentColor: COLORS.accent,
      intro: parts.intro,
      rows,
      outro: parts.outro,
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: plainVersion(parts, rows, data),
  };
}

/** Termin minął. */
export function paymentOverdueEmail(
  data: InvoiceEmailData & { daysOverdue: number },
  fields?: TemplateFields | null,
): EmailContent {
  const values = templateValues(data, data.daysOverdue);
  const parts = resolveFields(DEFAULT_FIELDS.PAYMENT_OVERDUE(data), fields, values);

  const rows: Array<[string, string]> = [
    ["Numer", data.invoiceNumber],
    ["Do zapłaty", formatPLN(data.remainingGrosze)],
    ["Termin minął", dateFormat.format(data.dueDate)],
  ];

  return {
    subject: parts.subject,
    html: layout({
      heading: parts.heading,
      accentColor: COLORS.bad,
      intro: parts.intro,
      rows,
      outro: parts.outro,
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: plainVersion(parts, rows, data),
  };
}
