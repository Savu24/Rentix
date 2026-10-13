"use client";

import { MoneyDisplay } from "@/components/ui/money-display";
import type { UtilitiesMode } from "@/generated/prisma/enums";
import { useI18n } from "@/lib/i18n/client";
import { formatDateIn } from "@/lib/i18n/format";
import { firstBilling, leaseMonthlySummary } from "@/lib/leases/summary";
import { formatMoney, parseMoney } from "@/lib/money";

/** Wartości pól formularza w surowej postaci — tak, jak je trzyma react-hook-form. */
export type LeaseSummaryInput = {
  rent: string;
  deposit: string;
  utilitiesMode: UtilitiesMode;
  utilitiesAdvance: string;
  startDate: string;
  endDate: string;
  billingStartsAt: string;
  billingDay: number | string;
  paymentTermDays: number | string;
};

const isoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;

/**
 * Podsumowanie obok formularza umowy (redesign/12-umowa-formularz.svg):
 * ile miesięcznie, kiedy i na ile pierwszy rachunek, kiedy pierwsza wpłata.
 *
 * Liczy wyłącznie `lib/leases/summary` — tymi samymi funkcjami, którymi
 * nalicza cron — więc podsumowanie nie rozjedzie się z pierwszym dokumentem.
 * Niepełne dane dają kreskę zamiast zgadywanej liczby.
 */
export function LeaseSummary({ values }: { values: LeaseSummaryInput }) {
  const { d, locale } = useI18n();
  const misc = d.panel.panelMisc;
  const t = d.panel.leasesPage.form;

  const rentGrosze = parseMoney(values.rent, locale) ?? 0;
  const utilitiesAdvanceGrosze = parseMoney(values.utilitiesAdvance, locale) ?? 0;
  const depositGrosze = parseMoney(values.deposit, locale);
  const monthly = leaseMonthlySummary({
    rentGrosze,
    utilitiesMode: values.utilitiesMode,
    utilitiesAdvanceGrosze,
  });

  const startDate = isoDate(values.startDate);
  const first = startDate
    ? firstBilling({
        startDate,
        endDate: isoDate(values.endDate),
        billingStartsAt: isoDate(values.billingStartsAt),
        rentGrosze,
        utilitiesMode: values.utilitiesMode,
        utilitiesAdvanceGrosze,
        billingDay: Number(values.billingDay) || 1,
        paymentTermDays: Number(values.paymentTermDays) || 0,
      })
    : null;

  const empty = <span className="text-subtle">-</span>;

  return (
    <section className="flex flex-col gap-5 rounded-tile border border-border bg-surface p-5 lg:p-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-[550] text-muted">{misc.monthly}</h2>
        <MoneyDisplay
          grosze={monthly.totalGrosze}
          locale={locale}
          className="text-[32px] leading-none tracking-[-0.8px] text-fg"
          currencyClassName="text-muted"
        />
      </div>

      <dl className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <dt className="text-[12.5px] font-medium text-subtle">{misc.firstBilling}</dt>
          <dd className="font-mono text-[14.5px] font-[550] text-fg">
            {first ? (
              <>
                {formatDateIn(first.period.issueDate, locale, "short")}
                <span className="block text-[13px] font-normal text-muted">
                  {formatMoney(first.amountGrosze, locale)}
                </span>
              </>
            ) : (
              empty
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[12.5px] font-medium text-subtle">{misc.firstPaymentDue}</dt>
          <dd className="font-mono text-[14.5px] font-[550] text-fg">
            {first ? formatDateIn(first.period.dueDate, locale, "short") : empty}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[12.5px] font-medium text-subtle">{t.deposit}</dt>
          <dd className="font-mono text-[14.5px] font-[550] text-fg">
            {depositGrosze !== null ? formatMoney(depositGrosze, locale) : empty}
          </dd>
        </div>
      </dl>
    </section>
  );
}
