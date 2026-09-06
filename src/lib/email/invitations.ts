import { getDictionary } from "@/lib/i18n";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { fill, formatDateIn } from "@/lib/i18n/format";

import type { EmailContent } from "./client";
import { escapeHtml, textToHtml } from "./render";

/**
 * Wiadomości z zaproszeniem — do zespołu i do portalu najemcy.
 *
 * Osobny plik od `templates.ts`, mimo podobnego wyglądu. Tamte wiadomości
 * niosą dokument w załączniku i tabelę z kwotą, a świadomie nie mają przycisku
 * — najemca nie ma dokąd kliknąć. Tutaj jest odwrotnie: cała treść to jeden
 * link, po którego kliknięciu zakłada się konto. Wciśnięcie tego w tamten
 * układ znaczyłoby dwa warunki w każdym wierszu szablonu.
 *
 * Tych dwóch szablonów wynajmujący nie edytuje. Treść niesie instrukcję
 * i termin ważności linku, więc przepisana po swojemu potrafiłaby zostawić
 * odbiorcę bez informacji, co ma zrobić.
 */

const COLORS = {
  ink: "#16301D",
  muted: "#6B7266",
  accent: "#1B4D3E",
  surface: "#FFFFFF",
  page: "#F7F4EE",
  rule: "#DED2B8",
};

function layout(options: {
  locale: Locale;
  heading: string;
  intro: string;
  cta: string;
  url: string;
  outro: string;
  footer: string;
  senderName: string;
}): string {
  const t = getDictionary(options.locale).emails;

  return `<!doctype html>
<html lang="${LOCALE_META[options.locale].htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:24px;background:${COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.surface};border:1px solid ${COLORS.rule};border-radius:14px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.accent};font-weight:600;">
            ${escapeHtml(options.heading)}
          </p>
          <p style="margin:0;color:${COLORS.ink};font-size:15px;line-height:1.6;">${textToHtml(options.intro)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 0;">
          <!--
            Przycisk jako komórka tabeli z tłem, nie <button> ani <a> ze stylami
            układu: Outlook nie rysuje tła na elementach liniowych, więc
            przycisk zrobiony inaczej dochodzi tam jako sam podkreślony tekst.
          -->
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-radius:10px;background:${COLORS.accent};">
                <a href="${escapeHtml(options.url)}"
                   style="display:inline-block;padding:12px 20px;color:#FFFFFF;font-size:14.5px;
                          font-weight:600;text-decoration:none;border-radius:10px;">
                  ${escapeHtml(options.cta)}
                </a>
              </td>
            </tr>
          </table>

          <!--
            Adres wypisany też jawnie. Klienci pocztowe firm potrafią wyciąć
            przycisk albo przepisać link przez skaner bezpieczeństwa; wtedy
            skopiowanie adresu ręcznie jest jedyną drogą dalej.
          -->
          <p style="margin:14px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.6;word-break:break-all;">
            ${escapeHtml(options.url)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 28px;">
          <p style="margin:0;color:${COLORS.muted};font-size:13px;line-height:1.6;">${textToHtml(options.outro)}</p>
          <p style="margin:16px 0 0;color:${COLORS.muted};font-size:12px;">
            ${escapeHtml(options.senderName)} · ${escapeHtml(t.automaticFooter)}
          </p>
          <p style="margin:6px 0 0;color:${COLORS.muted};font-size:12px;">
            ${escapeHtml(options.footer)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type InvitationEmailData = {
  locale: Locale;
  /** Nazwa organizacji, która zaprasza — po niej odbiorca poznaje nadawcę. */
  organizationName: string;
  /** Imię odbiorcy, gdy je znamy. Zespół zapraszamy po adresie, więc bywa puste. */
  recipientName?: string | null;
  url: string;
  expiresAt: Date;
};

function build(
  data: InvitationEmailData,
  texts: { subject: string; heading: string; intro: string; outro: string; cta: string },
): EmailContent {
  const d = getDictionary(data.locale);
  const expiry = fill(d.emails.invitations.expires, {
    date: formatDateIn(data.expiresAt, data.locale, "long"),
  });

  return {
    subject: texts.subject,
    html: layout({
      locale: data.locale,
      heading: texts.heading,
      intro: texts.intro,
      cta: texts.cta,
      url: data.url,
      outro: texts.outro,
      footer: expiry,
      senderName: data.organizationName,
    }),
    text: [texts.heading, "", texts.intro, "", data.url, "", texts.outro, expiry].join("\n"),
  };
}

/** Zaproszenie współpracownika do panelu organizacji. */
export function teamInvitationEmail(
  data: InvitationEmailData & { roleLabel: string },
): EmailContent {
  const t = getDictionary(data.locale).emails.invitations.team;

  return build(data, {
    subject: fill(t.subject, { organization: data.organizationName }),
    heading: t.heading,
    intro: fill(t.intro, { organization: data.organizationName, role: data.roleLabel }),
    outro: t.outro,
    cta: t.cta,
  });
}

/** Zaproszenie najemcy do jego portalu. */
export function tenantInvitationEmail(data: InvitationEmailData): EmailContent {
  const t = getDictionary(data.locale).emails.invitations.tenant;

  return build(data, {
    subject: fill(t.subject, { organization: data.organizationName }),
    heading: t.heading,
    intro: fill(t.intro, {
      name: data.recipientName?.trim() || t.fallbackName,
      organization: data.organizationName,
    }),
    outro: t.outro,
    cta: t.cta,
  });
}
