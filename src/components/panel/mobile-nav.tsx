"use client";

import { ChevronRight, LogOut, Menu, Moon, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOutAction } from "@/app/(app)/actions";
import { OrganizationSwitcher } from "@/components/panel/organization-switcher";
import { PlanLockMark } from "@/components/panel/plan-lock-mark";
import { useTheme } from "@/components/theme/theme-provider";
import type { UserOrganization } from "@/lib/auth/session";
import { usePlanAllows } from "@/lib/billing/client";
import type { PlanFeature } from "@/lib/billing/features";
import { useI18n } from "@/lib/i18n/client";
import {
  isNavItemActive,
  MOBILE_NAV,
  MOBILE_OVERFLOW_NAV,
  navLabel,
} from "@/lib/panel/nav";
import { cn } from "@/lib/utils";

function RowChevron() {
  return <ChevronRight className="ml-auto size-5 shrink-0 text-subtle" aria-hidden />;
}

/** Plakietka planu zamiast strzałki, gdy konto nie ma funkcji tej pozycji. */
function FeatureRowEnd({ feature }: { feature: PlanFeature }) {
  const allowed = usePlanAllows(feature);

  if (allowed) return <RowChevron />;
  return <PlanLockMark feature={feature} variant="badge" className="ml-auto" />;
}

/**
 * Dolny pasek nawigacji na telefonie i arkusz „Więcej"
 * (redesign/25-menu-mobile.svg).
 *
 * `sticky bottom-0` zamiast `fixed`: pasek zostaje w normalnym przepływie
 * dokumentu, więc nie zasłania końca treści i nie wymaga sztucznego paddingu
 * na dole każdej strony.
 *
 * Cztery skróty plus „Więcej”. Pasek nie rośnie razem z liczbą modułów —
 * przy siedmiu pozycjach etykiety zrobiłyby się nieczytelne, a wcześniejsza
 * sztywna lista pięciu adresów po prostu gubiła nowe zakładki.
 *
 * Pasek górny zniknął także na telefonie, więc arkusz przejął jego akcje:
 * przełącznik organizacji (od dwóch), wejście do administracji, motyw
 * i wylogowanie.
 */
export function MobileNav({
  organizations,
  activeOrganizationId,
  isAdmin,
}: {
  organizations: UserOrganization[];
  activeOrganizationId: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const { d } = useI18n();
  const t = d.panel.shell;
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  // Zmiana strony zamyka arkusz — inaczej zostawałby otwarty nad nowym
  // widokiem, bo nawigacja w Next.js nie odmontowuje tego komponentu.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const overflowActive = MOBILE_OVERFLOW_NAV.some((item) => isNavItemActive(item, pathname));

  const rowClass =
    "flex h-12 items-center gap-3 rounded-xl px-4 text-base transition-colors";

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-scrim"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="arkusz-wiecej"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-[20px] bg-surface px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float"
          >
            <span className="mx-auto h-[5px] w-9 shrink-0 rounded-full bg-border-strong" aria-hidden />

            <div className="mt-4 mb-4 flex items-center justify-between px-1">
              <p id="arkusz-wiecej" className="r-display text-xl text-fg">
                {t.more}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.closeMenu}
                className="flex size-8 items-center justify-center rounded-full bg-surface-alt text-muted transition-colors hover:text-fg"
              >
                <X className="size-[18px]" aria-hidden />
              </button>
            </div>

            <nav aria-label={t.navAria} className="flex flex-col gap-2">
              {MOBILE_OVERFLOW_NAV.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;

                if (item.soon) {
                  return (
                    <span key={item.href} aria-disabled className={cn(rowClass, "text-subtle")}>
                      <Icon className="size-[22px] shrink-0" aria-hidden />
                      {navLabel(item, d.panel.nav)}
                      <span className="ml-auto text-[10px] tracking-wide uppercase">{t.soon}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      rowClass,
                      active
                        ? "bg-accent-soft font-[650] text-accent"
                        : "font-medium text-fg hover:bg-hover",
                    )}
                  >
                    <Icon
                      className={cn("size-[22px] shrink-0", !active && "text-muted")}
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    {navLabel(item, d.panel.nav)}
                    {item.feature ? <FeatureRowEnd feature={item.feature} /> : <RowChevron />}
                  </Link>
                );
              })}

              {isAdmin ? (
                <Link href="/admin" className={cn(rowClass, "font-medium text-fg hover:bg-hover")}>
                  <ShieldCheck className="size-[22px] shrink-0 text-muted" strokeWidth={1.8} aria-hidden />
                  {t.account.admin}
                  <RowChevron />
                </Link>
              ) : null}
            </nav>

            <div className="mx-4 mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {organizations.length > 1 ? (
                <div className="py-2">
                  <OrganizationSwitcher
                    organizations={organizations}
                    activeId={activeOrganizationId}
                  />
                </div>
              ) : null}

              <button
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
                onClick={toggleTheme}
                className="flex h-14 items-center gap-3 text-left text-[15px] font-medium text-fg"
              >
                <Moon className="size-5 shrink-0 text-muted" aria-hidden />
                {t.account.darkMode}
                <span
                  className={cn(
                    "relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors",
                    theme === "dark" ? "bg-accent" : "bg-border-strong",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-on-color transition-[left]",
                      theme === "dark" ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </span>
              </button>

              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex h-12 w-full items-center gap-3 text-left text-[15px] font-[550] text-bad"
                >
                  <LogOut className="size-5 shrink-0" aria-hidden />
                  {t.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label={t.mobileNavAria}
        className="sticky bottom-0 z-30 flex items-stretch border-t border-border bg-surface px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {MOBILE_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          const label = navLabel(item, d.panel.nav, true);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-btn py-0.5"
            >
              <span
                className={cn(
                  "flex h-[30px] w-14 items-center justify-center rounded-full transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-subtle",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 1.9 : 1.7} aria-hidden />
              </span>
              <span
                className={cn(
                  "text-[11.5px] leading-none",
                  active ? "font-[650] text-accent" : "font-medium text-muted",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* „Więcej" świeci się, gdy jesteś na którejkolwiek ze stron spod
            niego — inaczej pasek sugerowałby, że stoisz poza nawigacją. */}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex flex-1 flex-col items-center gap-1.5 rounded-btn py-0.5"
        >
          <span
            className={cn(
              "flex h-[30px] w-14 items-center justify-center rounded-full transition-colors",
              open || overflowActive ? "bg-accent-soft text-accent" : "text-subtle",
            )}
          >
            <Menu className="size-[22px]" strokeWidth={1.7} aria-hidden />
          </span>
          <span
            className={cn(
              "text-[11.5px] leading-none",
              open || overflowActive ? "font-[650] text-accent" : "font-medium text-muted",
            )}
          >
            {t.more}
          </span>
        </button>
      </nav>
    </>
  );
}
