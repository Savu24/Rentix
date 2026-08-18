import { formatPLN } from "@/lib/money";

import type { EmailContent } from "./client";

/**
 * Szablony wiadomości do najemcy.
 *
 * HTML ze stylami wpisanymi w atrybut `style`: klienci pocztowi (Outlook,
 * Gmail w aplikacji) wycinają `<style>` z nagłówka, więc arkusz zewnętrzny
 * ani klasy nie zadziałają. Układ oparty na tabeli z tego samego powodu.
 *
 * Kolory są przepisane z design systemu jako literały — e-mail nie ma dostępu
 * do zmiennych CSS aplikacji.
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
};

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
  <body style="margin:0;padding:24px;background:${COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.surface};border:1px solid ${COLORS.rule};border-radius:14px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:${options.accentColor};font-weight:600;">
            ${options.heading}
          </p>
          <p style="margin:0;color:${COLORS.ink};font-size:15px;line-height:1.6;">${options.intro}</p>
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
          <p style="margin:0;color:${COLORS.muted};font-size:13px;line-height:1.6;">${options.outro}</p>
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;">
            ${options.landlordName} · wiadomość wysłana automatycznie z systemu Rentix
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

/** Wystawiono nowy dokument. */
export function invoiceIssuedEmail(data: InvoiceEmailData): EmailContent {
  const subject = `${data.invoiceNumber} — ${formatPLN(data.amountGrosze)} do ${dateFormat.format(data.dueDate)}`;

  return {
    subject,
    html: layout({
      heading: "Nowy dokument",
      accentColor: COLORS.accent,
      intro: `Dzień dobry, ${data.tenantFirstName}. Wystawiliśmy dokument rozliczeniowy${
        data.periodLabel ? ` za ${data.periodLabel}` : ""
      }.`,
      rows: [
        ["Numer", data.invoiceNumber],
        ["Kwota", formatPLN(data.amountGrosze)],
        ["Termin płatności", dateFormat.format(data.dueDate)],
      ],
      outro: "Jeśli płatność została już wykonana, prosimy potraktować tę wiadomość jako informacyjną.",
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: textVersion([
      `Dzień dobry, ${data.tenantFirstName}.`,
      "",
      `Wystawiliśmy dokument ${data.invoiceNumber}${data.periodLabel ? ` za ${data.periodLabel}` : ""}.`,
      `Kwota: ${formatPLN(data.amountGrosze)}`,
      `Termin płatności: ${dateFormat.format(data.dueDate)}`,
      data.attached ? "\nDokument PDF jest w załączniku tej wiadomości." : null,
      "",
      `${data.landlordName} · wiadomość wysłana automatycznie z systemu Rentix`,
    ]),
  };
}

/** Termin płatności się zbliża. */
export function paymentReminderEmail(data: InvoiceEmailData): EmailContent {
  const subject = `Przypomnienie: ${data.invoiceNumber} — termin ${dateFormat.format(data.dueDate)}`;

  return {
    subject,
    html: layout({
      heading: "Zbliża się termin",
      accentColor: COLORS.accent,
      intro: `Dzień dobry, ${data.tenantFirstName}. Przypominamy o zbliżającym się terminie płatności.`,
      rows: [
        ["Numer", data.invoiceNumber],
        ["Do zapłaty", formatPLN(data.remainingGrosze)],
        ["Termin", dateFormat.format(data.dueDate)],
      ],
      outro: "Jeśli przelew jest już w drodze, prosimy zignorować tę wiadomość.",
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: textVersion([
      `Dzień dobry, ${data.tenantFirstName}.`,
      "",
      `Przypominamy o płatności ${data.invoiceNumber}.`,
      `Do zapłaty: ${formatPLN(data.remainingGrosze)}`,
      `Termin: ${dateFormat.format(data.dueDate)}`,
      data.attached ? "\nDokument PDF jest w załączniku tej wiadomości." : null,
      "",
      `${data.landlordName} · wiadomość wysłana automatycznie z systemu Rentix`,
    ]),
  };
}

/** Termin minął. */
export function paymentOverdueEmail(data: InvoiceEmailData & { daysOverdue: number }): EmailContent {
  const subject = `Zaległość: ${data.invoiceNumber} — ${formatPLN(data.remainingGrosze)}`;

  return {
    subject,
    html: layout({
      heading: "Płatność po terminie",
      accentColor: COLORS.bad,
      intro: `Dzień dobry, ${data.tenantFirstName}. Termin płatności minął ${data.daysOverdue} ${
        data.daysOverdue === 1 ? "dzień" : "dni"
      } temu, a wpłata nie została jeszcze odnotowana.`,
      rows: [
        ["Numer", data.invoiceNumber],
        ["Do zapłaty", formatPLN(data.remainingGrosze)],
        ["Termin minął", dateFormat.format(data.dueDate)],
      ],
      outro:
        "Jeśli płatność została wykonana w ciągu ostatnich dni, prosimy o kontakt — sprawdzimy, czy wpłata do nas dotarła.",
      attached: data.attached,
      landlordName: data.landlordName,
    }),
    text: textVersion([
      `Dzień dobry, ${data.tenantFirstName}.`,
      "",
      `Dokument ${data.invoiceNumber} jest po terminie płatności (${dateFormat.format(data.dueDate)}).`,
      `Do zapłaty: ${formatPLN(data.remainingGrosze)}`,
      data.attached ? "\nDokument PDF jest w załączniku tej wiadomości." : null,
      "",
      `${data.landlordName} · wiadomość wysłana automatycznie z systemu Rentix`,
    ]),
  };
}
