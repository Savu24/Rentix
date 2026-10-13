import { TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string;
  /** Plakietka przy etykiecie, np. „+2 w 30 dni". */
  badge?: string;
  /** Linijka danych pod liczbą („4 nieruchomości, 5 kartotek najemców"). */
  hint?: string;
};

/**
 * Cztery liczby w jednej płycie (redesign/24-admin-*.svg): etykieta nad
 * liczbą, bo płytę czyta się skanując wzrokiem wiersz, a wtedy najpierw
 * trzeba wiedzieć, na co się patrzy. Na telefonie dwie kolumny.
 */
export function StatPlate({ stats }: { stats: Stat[] }) {
  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-tile border border-border bg-surface lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "flex min-w-0 flex-col gap-2 p-5 lg:px-6",
            index % 2 === 1 && "border-l border-border",
            index >= 2 && "border-t border-border lg:border-t-0",
            index === 2 && "lg:border-l",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-[550] text-muted">{stat.label}</span>
            {stat.badge ? (
              <Badge tone="good" size="sm" icon={TrendingUp}>
                {stat.badge}
              </Badge>
            ) : null}
          </div>
          <span className="font-mono text-[30px] leading-9 font-[650] tracking-[-0.6px] whitespace-nowrap text-fg">
            {stat.value}
          </span>
          {stat.hint ? <span className="text-[12.5px] text-subtle">{stat.hint}</span> : null}
        </div>
      ))}
    </section>
  );
}
