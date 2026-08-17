/**
 * Ścieżki auth w jednym miejscu — importuje je middleware (Edge), konfiguracja
 * NextAuth i komponenty. Brak zależności, więc plik jest bezpieczny wszędzie.
 */

export const ROUTES = {
  home: "/",
  login: "/logowanie",
  register: "/rejestracja",
  /** Panel właściciela / zarządcy. */
  ownerDashboard: "/panel",
  /** Uproszczony panel najemcy. */
  tenantDashboard: "/najemca",
} as const;

/** Strony, na które zalogowany użytkownik nie powinien wracać. */
export const GUEST_ONLY_ROUTES: string[] = [ROUTES.login, ROUTES.register];

/** Prefiksy wymagające zalogowania. */
export const PROTECTED_PREFIXES: string[] = [ROUTES.ownerDashboard, ROUTES.tenantDashboard];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Dokąd trafia użytkownik po zalogowaniu — zależnie od roli. */
export function landingPathForRole(role: string | undefined): string {
  return role === "TENANT" ? ROUTES.tenantDashboard : ROUTES.ownerDashboard;
}
