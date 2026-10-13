import { formatMoneyParts } from "@/lib/money";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Duża kwota w kaflu: liczba w cyfrach tabelarycznych i mniejszy symbol
 * waluty („3 105,00 zł", 46/24 px w redesign/01-design-system.svg).
 *
 * Formatuje `money.ts` — komponent tylko rozkłada gotowe części. Nigdy się
 * nie zawija: kwota ucięta w połowie przestaje być kwotą, więc przy wąskim
 * kaflu ma się zmniejszyć krój, a nie łamać wiersz.
 */
export function MoneyDisplay({
  grosze,
  locale,
  sign = false,
  className,
  currencyClassName,
}: {
  grosze: number;
  locale: Locale;
  /** Plus przed kwotą dodatnią (bilans „na plusie"). */
  sign?: boolean;
  className?: string;
  currencyClassName?: string;
}) {
  const { amount, currency, currencyFirst } = formatMoneyParts(grosze, locale);
  // Znak stoi przed całą kwotą, także przed symbolem z przodu: „-£205.00".
  const minus = /^[-−]/.exec(amount)?.[0] ?? "";
  const prefix = minus || (sign && grosze > 0 ? "+" : "");
  const digits = amount.slice(minus.length);

  const symbol = (
    <span className={cn("text-[0.52em] font-semibold tracking-normal", currencyClassName)}>
      {currency}
    </span>
  );

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[0.22em] font-mono font-[650] whitespace-nowrap",
        className,
      )}
    >
      {currencyFirst ? (
        <span>
          {prefix}
          {symbol}
          {digits}
        </span>
      ) : (
        <>
          <span>
            {prefix}
            {digits}
          </span>
          {symbol}
        </>
      )}
    </span>
  );
}
