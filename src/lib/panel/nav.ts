import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Skrócona etykieta na dolny pasek mobilny, gdzie nie ma miejsca. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Moduł jeszcze nie zbudowany — link jest nieaktywny zamiast prowadzić w 404. */
  soon?: boolean;
};

export const PANEL_NAV: NavItem[] = [
  { href: "/panel", label: "Pulpit", icon: LayoutDashboard },
  { href: "/panel/nieruchomosci", label: "Nieruchomości", shortLabel: "Obiekty", icon: Building2 },
  { href: "/panel/najemcy", label: "Najemcy", icon: Users },
  { href: "/panel/umowy", label: "Umowy", icon: FileText },
  { href: "/panel/finanse", label: "Finanse", icon: Wallet },
  // Zgłoszenia usterek świadomie poza zakresem: najemcy zgłaszają awarie
  // telefonem, więc moduł dublowałby kanał, z którego i tak nikt by nie
  // korzystał. Tabele w bazie zostają — nic nie kosztują, a odwrócenie tej
  // decyzji nie wymagałoby wtedy migracji.
  { href: "/panel/raporty", label: "Raporty", icon: BarChart3 },
  { href: "/panel/ustawienia", label: "Ustawienia", shortLabel: "Konto", icon: Settings },
];

/** Pięć pozycji na dolny pasek — więcej nie mieści się czytelnie na telefonie. */
export const MOBILE_NAV: NavItem[] = PANEL_NAV.filter((item) =>
  ["/panel", "/panel/nieruchomosci", "/panel/najemcy", "/panel/finanse", "/panel/ustawienia"].includes(
    item.href,
  ),
);

/**
 * Czy pozycja jest aktywna dla danej ścieżki.
 *
 * „/panel" dopasowuje się wyłącznie dokładnie — inaczej pulpit świeciłby się
 * na każdej podstronie panelu.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/panel") return pathname === "/panel";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
