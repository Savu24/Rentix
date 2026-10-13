"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV, isAdminNavItemActive } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

/**
 * Pozycje panelu administratora (redesign/24-admin-*.svg).
 *
 * `variant="side"` — pionowa lista w ciemnozielonym pasku bocznym, tak samo
 * jak w panelu klienta (bursztynowy znacznik aktywnej pozycji).
 * `variant="top"` — przewijany rząd na telefonie, gdzie paska bocznego nie ma.
 */
export function AdminNav({ variant = "side" }: { variant?: "side" | "top" }) {
  const pathname = usePathname();

  if (variant === "top") {
    return (
      <nav aria-label="Sekcje panelu administratora" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {ADMIN_NAV.map((item) => {
          const active = isAdminNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[34px] shrink-0 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-[550] transition-colors",
                active ? "bg-side-active text-side-active-ink" : "text-side-ink hover:bg-side-active/50",
              )}
            >
              <Icon className={cn("size-4", active ? "text-highlight" : "text-side-ink-2")} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Sekcje panelu administratora" className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const active = isAdminNavItemActive(item, pathname);
        const Icon = item.icon;

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
              <span className="absolute top-2.5 left-0 h-5 w-[3px] rounded-full bg-highlight" aria-hidden />
            ) : null}
            <Icon
              className={cn("size-[18px] shrink-0", active ? "text-highlight" : "text-side-ink-2")}
              strokeWidth={1.7}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
