import { ChevronDown, Pencil, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { DataItem } from "@/components/panel/section-card";
import { cn } from "@/lib/utils";

/**
 * Karty danych ekranu szczegółów (dostęp do lokalu, dokumenty tożsamości,
 * ubezpieczenie…): pary „etykieta nad wartością" albo wolny tekst.
 *
 * Na desktopie siatka kart, na telefonie rozwijane wiersze — tak rysuje je
 * projekt, żeby karta nie ciągnęła się bez końca na małym ekranie. Treść jest
 * statyczna (sam tekst), więc oba warianty mogą stać w drzewie naraz.
 */
export type InfoSection = {
  title: string;
  icon: LucideIcon;
} & (
  | { items: [label: string, value: React.ReactNode][]; text?: never }
  | { text: string | null; items?: never }
);

/** Zostawia tylko sekcje, w których jest co pokazać. */
export function nonEmptySections(sections: InfoSection[]): InfoSection[] {
  return sections.filter((section) =>
    section.text !== undefined
      ? Boolean(section.text)
      : (section.items ?? []).some(([, value]) => Boolean(value)),
  );
}

function SectionBody({ section }: { section: InfoSection }) {
  if (section.text !== undefined) {
    return <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{section.text}</p>;
  }

  return (
    <dl className="flex flex-col gap-4">
      {(section.items ?? [])
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => (
          <DataItem key={label} label={label}>
            {value}
          </DataItem>
        ))}
    </dl>
  );
}

export function InfoSections({
  sections,
  columns = 3,
  editHref,
  editLabel,
  mobileExtra,
}: {
  sections: InfoSection[];
  /** Kolumny siatki na desktopie. */
  columns?: 1 | 3;
  /** Ołówek przy każdej karcie prowadzi do edycji całego rekordu. */
  editHref?: string;
  editLabel?: string;
  /** Dodatkowe wiersze na początku listy na telefonie (np. portal najemcy). */
  mobileExtra?: React.ReactNode;
}) {
  if (sections.length === 0 && !mobileExtra) return null;

  return (
    <>
      <div className={cn("hidden gap-4 lg:grid", columns === 3 ? "lg:grid-cols-3 lg:gap-6" : "")}>
        {sections.map((section) => (
          <section
            key={section.title}
            className={cn(
              "flex flex-col gap-4 rounded-card border border-border bg-surface",
              columns === 3 ? "p-6" : "p-5",
            )}
          >
            <header className="flex items-center gap-2.5">
              <section.icon className="size-[18px] text-subtle" aria-hidden />
              <h2 className="flex-1 text-[14.5px] font-semibold text-fg">{section.title}</h2>
              {editHref ? (
                <Link
                  href={editHref}
                  className="rounded-btn text-subtle transition-colors hover:text-fg"
                  aria-label={`${editLabel ?? ""}: ${section.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
              ) : null}
            </header>
            <SectionBody section={section} />
          </section>
        ))}
      </div>

      <div className="flex flex-col overflow-hidden rounded-tile border border-border bg-surface lg:hidden">
        {mobileExtra}
        {sections.map((section) => (
          <details key={section.title} className="group border-t border-border first:border-t-0">
            <summary className="flex h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
              <section.icon className="size-[18px] text-subtle" aria-hidden />
              <span className="flex-1 text-[15px] font-semibold text-fg">{section.title}</span>
              <ChevronDown
                className="size-5 text-subtle transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="px-4 pb-4">
              <SectionBody section={section} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
