"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/panel/account-menu";
import { SidebarOrganization } from "@/components/panel/organization-switcher";
import { PlanLockMark } from "@/components/panel/plan-lock-mark";
import type { UserOrganization } from "@/lib/auth/session";
import { useI18n } from "@/lib/i18n/client";
import { isNavItemActive, navLabel, PANEL_NAV } from "@/lib/panel/nav";
import { cn } from "@/lib/utils";

/**
 * Pasek boczny panelu (desktop, od `lg`) w ciemnej butelkowej zieleni.
 *
 * Jedyny mocny akcent ekranu: treść leży obok na jasnym papierze, a aktywną
 * pozycję wyróżnia bursztynowy znacznik. Przyklejony do wysokości okna, więc
 * karta organizacji u góry i konto w stopce są zawsze pod ręką — pasek górny
 * zniknął i to one przejęły jego role.
 */
export function Sidebar({
  userName,
  email,
  roleLabel,
  planLabel,
  initials,
  organizations,
  activeOrganizationId,
  isAdmin,
}: {
  userName: string;
  email: string | null;
  roleLabel: string;
  planLabel: string;
  initials: string;
  organizations: UserOrganization[];
  activeOrganizationId: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const { d } = useI18n();
  const t = d.panel.shell;

  return (
    <aside className="sticky top-0 z-40 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-side-line bg-linear-to-b from-side to-side-end lg:flex">
      <div className="flex flex-col gap-5 px-4 pt-6">
        <Link href="/panel" className="self-start rounded-btn px-2 focus-visible:outline-side-on">
          <Logo size="sm" onDark />
        </Link>

        <SidebarOrganization
          organizations={organizations}
          activeId={activeOrganizationId}
          planLabel={planLabel}
        />
      </div>

      <nav aria-label={t.navAria} className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4">
        {PANEL_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;

          if (item.soon) {
            return (
              <span
                key={item.href}
                aria-disabled
                title={t.soonTitle}
                className="flex h-10 shrink-0 cursor-not-allowed items-center gap-3 rounded-control px-3.5 text-sm font-medium text-side-ink-2"
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span className="truncate">{navLabel(item, d.panel.nav)}</span>
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
                "relative flex h-10 shrink-0 items-center gap-3 rounded-control px-3.5 text-sm transition-colors",
                "focus-visible:outline-side-on",
                active
                  ? "bg-side-active font-semibold text-side-active-ink"
                  : "font-medium text-side-ink hover:bg-side-active/50 hover:text-side-active-ink",
              )}
            >
              {active ? (
                <span
                  className="absolute top-2.5 left-0 h-5 w-[3px] rounded-full bg-highlight"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={cn("size-[18px] shrink-0", active ? "text-highlight" : "text-side-ink-2")}
                strokeWidth={1.7}
                aria-hidden
              />
              <span className="truncate">{navLabel(item, d.panel.nav)}</span>
              {item.feature ? (
                <PlanLockMark feature={item.feature} className="ml-auto size-4 text-side-ink-2" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mt-4 border-t border-side-line py-3">
        <AccountMenu
          userName={userName}
          email={email}
          roleLabel={roleLabel}
          initials={initials}
          isAdmin={isAdmin}
        />
      </div>
    </aside>
  );
}
