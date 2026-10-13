import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Nagłówek ekranu panelu (redesign/_generator/lib.mjs, `pageHeader`
 * i `mobileHeader`).
 *
 * Bez podtytułu: tytuł, ewentualnie powrót nad nim, plakietki obok i jeden
 * wiersz faktów pod spodem. Jedna główna akcja w prawym górnym rogu — na
 * telefonie jako okrągły przycisk przy tytule. Akcje dodatkowe na telefonie
 * nie znikają, tylko schodzą pod tytuł.
 */
export function PageHeader({
  title,
  back,
  badges,
  meta,
  actions,
  primary,
  className,
}: {
  title: React.ReactNode;
  back?: { href: string; label: string };
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  /** Akcje drugorzędne (Archiwum, Edytuj…), przed akcją główną. */
  actions?: React.ReactNode;
  /** Główna akcja ekranu. */
  primary?: { href: string; label: string; icon: LucideIcon };
  className?: string;
}) {
  const PrimaryIcon = primary?.icon;

  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {back ? (
        <Link
          href={back.href}
          className="flex w-fit items-center gap-1.5 rounded-btn text-[13px] font-medium text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
          {back.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <h1 className="r-display min-w-0 text-[28px] leading-9 break-words text-fg lg:text-[30px]">
              {title}
            </h1>
            {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
          </div>
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">{meta}</div>
          ) : null}
        </div>

        {primary && PrimaryIcon ? (
          <Button asChild size="icon" className="size-11 shrink-0 rounded-full lg:hidden">
            <Link href={primary.href} aria-label={primary.label}>
              <PrimaryIcon className="size-[22px]" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
        ) : null}

        {/* Akcje są w drzewie raz: na telefonie schodzą do własnego wiersza
            pod tytułem, na desktopie stoją w prawym górnym rogu. */}
        {actions || primary ? (
          <div
            className={cn(
              "order-last w-full flex-wrap items-center gap-2 lg:order-none lg:flex lg:w-auto lg:shrink-0 lg:gap-2.5",
              // Sama akcja główna ma na telefonie okrągły przycisk — bez
              // pustego wiersza pod tytułem.
              actions ? "flex" : "hidden",
            )}
          >
            {actions}
            {primary && PrimaryIcon ? (
              <Button asChild className="hidden lg:inline-flex">
                <Link href={primary.href}>
                  <PrimaryIcon className="size-[18px]" aria-hidden />
                  {primary.label}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
