"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n/client";
import { isNavItemActive, navLabel, PANEL_NAV } from "@/lib/panel/nav";
import { cn } from "@/lib/utils";

export function Sidebar({
  userName,
  planLabel,
  initials,
}: {
  userName: string;
  planLabel: string;
  initials: string;
}) {
  const pathname = usePathname();
  const { d } = useI18n();
  const t = d.panel.shell;

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-0.5 border-r border-border px-3 py-4 lg:flex">
      <Link href="/panel" className="mb-4 rounded-btn px-2.5 py-1.5">
        <Logo size="sm" />
      </Link>

      <nav aria-label={t.navAria} className="flex flex-col gap-0.5">
        {PANEL_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;

          if (item.soon) {
            return (
              <span
                key={item.href}
                aria-disabled
                title={t.soonTitle}
                className="flex cursor-not-allowed items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-muted/60"
              >
                <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
                <span className="truncate">{navLabel(item, d.panel.nav)}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide">{t.soon}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-fg hover:bg-surface-alt",
              )}
            >
              <Icon
                className={cn("h-[17px] w-[17px] shrink-0", !active && "text-muted")}
                aria-hidden
              />
              <span className="truncate">{navLabel(item, d.panel.nav)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent2-soft text-[13px] font-semibold text-accent2"
          aria-hidden
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-fg">{userName}</span>
          <span className="block text-xs text-muted">{planLabel}</span>
        </span>
      </div>
    </aside>
  );
}
