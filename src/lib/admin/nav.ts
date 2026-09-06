import {
  Activity,
  Building2,
  LayoutDashboard,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Nawigacja panelu administratora.
 *
 * Etykiety stoją tu wprost, a nie w słowniku: ten panel istnieje wyłącznie po
 * polsku, bo jego jedynym odbiorcą jest operator Rentiksa. Przepuszczanie go
 * przez i18n dokładałoby kilkaset kluczy do obu wersji krajowych i drugą
 * wersję językową do utrzymania — dla jednego użytkownika.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Przegląd", icon: LayoutDashboard },
  { href: "/admin/organizacje", label: "Organizacje", icon: Building2 },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
  { href: "/admin/system", label: "System", icon: Activity },
  { href: "/admin/dziennik", label: "Dziennik", icon: ScrollText },
];

/**
 * Czy pozycja odpowiada bieżącemu adresowi.
 *
 * `/admin` dopasowuje się wyłącznie dokładnie — jako prefiks podświetlałby się
 * na każdej podstronie naraz z właściwą pozycją.
 */
export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
