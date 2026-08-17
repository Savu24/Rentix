import {
  BarChart3,
  Building2,
  KeyRound,
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
  { href: "/panel/wlasciciele", label: "Właściciele", shortLabel: "Właśc.", icon: KeyRound },
  { href: "/panel/umowy", label: "Umowy", icon: FileText },
  { href: "/panel/finanse", label: "Finanse", icon: Wallet },
  // Zgłoszenia usterek świadomie poza zakresem: najemcy zgłaszają awarie
  // telefonem, więc moduł dublowałby kanał, z którego i tak nikt by nie
  // korzystał. Tabele w bazie zostają — nic nie kosztują, a odwrócenie tej
  // decyzji nie wymagałoby wtedy migracji.
  { href: "/panel/raporty", label: "Raporty", icon: BarChart3 },
  { href: "/panel/ustawienia", label: "Ustawienia", shortLabel: "Konto", icon: Settings },
];

/**
 * Cztery skróty na dolnym pasku telefonu; piąte miejsce zajmuje „Więcej".
 *
 * Wcześniej pasek był sztywną listą pięciu adresów, więc każdy nowy moduł
 * po prostu z niego wypadał i na telefonie stawał się nieosiągalny — tak
 * zniknęły Umowy, Raporty i Właściciele. Teraz reszta zawsze jest pod
 * „Więcej", bez ręcznego dopisywania.
 */
const MOBILE_PRIMARY_HREFS = [
  "/panel",
  "/panel/nieruchomosci",
  "/panel/najemcy",
  "/panel/finanse",
] as const;

export const MOBILE_NAV: NavItem[] = PANEL_NAV.filter((item) =>
  (MOBILE_PRIMARY_HREFS as readonly string[]).includes(item.href),
);

/** Pozycje spod „Więcej" — wszystko, czego nie ma na pasku. */
export const MOBILE_OVERFLOW_NAV: NavItem[] = PANEL_NAV.filter(
  (item) => !(MOBILE_PRIMARY_HREFS as readonly string[]).includes(item.href),
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
