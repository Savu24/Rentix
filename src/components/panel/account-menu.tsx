"use client";

import { Bell, ChevronsUpDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { useTheme } from "@/components/theme/theme-provider";
import { usePopover } from "@/components/panel/use-popover";
import { useI18n } from "@/lib/i18n/client";
import { THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Konto w stopce paska bocznego (redesign/25-menu-konta.svg).
 *
 * Zbiera wszystko, co wcześniej stało w pasku górnym: motyw, powiadomienia,
 * wejście do administracji i wylogowanie. Pasek górny zniknął, więc to jedyne
 * miejsce tych akcji na desktopie — na telefonie są w arkuszu „Więcej".
 */
export function AccountMenu({
  userName,
  email,
  roleLabel,
  initials,
  isAdmin,
}: {
  userName: string;
  email: string | null;
  roleLabel: string;
  initials: string;
  /**
   * Czy pokazać wejście do panelu administratora platformy.
   *
   * Rola bierze się z tokenu sesji, więc bywa o odświeżenie spóźniona — i to
   * wystarcza, bo decyduje wyłącznie o widoczności odnośnika. Kto na niego
   * kliknie bez uprawnień, dostanie 404 z `requireAdminSession`.
   */
  isAdmin: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.shell;
  const { theme, setTheme } = useTheme();
  const { open, setOpen, rootRef, triggerRef } = usePopover();

  const links = [
    // Powiadomienia prowadzą do ich ustawień: osobnej skrzynki powiadomień
    // w aplikacji nie ma, a dawny dzwonek w pasku górnym nic nie otwierał.
    { href: "/panel/ustawienia/powiadomienia", label: t.notifications, icon: Bell },
    ...(isAdmin ? [{ href: "/admin", label: t.account.admin, icon: ShieldCheck }] : []),
    { href: "/panel/ustawienia/konto", label: t.account.settings, icon: UserRound },
  ];

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div
          id="menu-konta"
          className="absolute bottom-full left-0 z-50 mb-2 w-[280px] rounded-card bg-surface shadow-float"
        >
          <div className="border-b border-border px-5 py-4">
            <p className="truncate text-[14.5px] leading-5 font-semibold text-fg">{userName}</p>
            {email ? <p className="truncate text-[13px] leading-[18px] text-muted">{email}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <span id="menu-konta-motyw" className="text-sm font-medium text-fg">
              {t.account.theme}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="menu-konta-motyw"
              className="flex rounded-[9px] bg-surface-alt p-[3px]"
            >
              {THEMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={theme === option}
                  onClick={() => setTheme(option)}
                  className={cn(
                    "h-[26px] rounded-[7px] px-3 text-[13px] font-[550] transition-colors",
                    theme === option ? "bg-surface text-fg shadow-btn" : "text-muted hover:text-fg",
                  )}
                >
                  {option === "light" ? t.account.light : t.account.dark}
                </button>
              ))}
            </div>
          </div>

          <nav className="flex flex-col px-2 pb-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium text-fg transition-colors hover:bg-hover"
              >
                <Icon className="size-[18px] shrink-0 text-muted" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <form action={signOutAction} className="border-t border-border p-2">
            <button
              type="submit"
              className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-sm font-[550] text-bad transition-colors hover:bg-bad-soft"
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              {t.signOut}
            </button>
          </form>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label={t.account.open}
        aria-expanded={open}
        aria-controls={open ? "menu-konta" : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-side-active focus-visible:outline-side-on"
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-highlight-soft text-[13.5px] font-semibold text-warn-ink"
          aria-hidden
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] leading-[18px] font-semibold text-side-active-ink">
            {userName}
          </span>
          <span className="block truncate text-xs leading-4 text-side-ink-2">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="size-[18px] shrink-0 text-side-ink-2" aria-hidden />
      </button>
    </div>
  );
}
