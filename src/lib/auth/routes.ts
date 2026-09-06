import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Ścieżki auth w jednym miejscu — importuje je middleware (Edge), konfiguracja
 * NextAuth i komponenty. Brak zależności poza konfiguracją wersji krajowych,
 * więc plik jest bezpieczny wszędzie.
 *
 * Część publiczna żyje pod prefiksem kraju (`/pl/logowanie`, `/uk/login`),
 * panel nie. Po zalogowaniu o języku decyduje ustawienie konta, a nie adres —
 * inaczej każda z kilkudziesięciu stron panelu musiałaby istnieć w dwóch
 * drzewach tras, z dwoma zestawami slugów do utrzymania.
 */

/** Segmenty publiczne w języku danej wersji — adres ma być czytelny dla jej odbiorcy. */
const PUBLIC_SEGMENTS: Record<Locale, { login: string; register: string }> = {
  pl: { login: "logowanie", register: "rejestracja" },
  uk: { login: "login", register: "sign-up" },
};

/**
 * Nazwa parametru z adresem powrotu po zalogowaniu.
 *
 * Widać ją w pasku adresu, więc idzie za językiem strony. Strona logowania
 * czyta oba warianty, żeby link skopiowany z jednej wersji nie gubił powrotu
 * w drugiej.
 */
export const RETURN_PARAM: Record<Locale, string> = {
  pl: "powrot",
  uk: "return",
};

export const RETURN_PARAMS = Object.values(RETURN_PARAM);

export const ROUTES = {
  /** Panel właściciela / zarządcy. */
  ownerDashboard: "/panel",
  /** Uproszczony panel najemcy. */
  tenantDashboard: "/najemca",
  /**
   * Panel administratora platformy — poza `/panel`, bo tamten layout wymaga
   * członkostwa w organizacji, a administrator patrzy na wszystkie naraz.
   */
  adminDashboard: "/admin",
  /**
   * Adresy bez prefiksu kraju. Nie renderują strony — middleware odsyła z nich
   * na wersję odwiedzającego. Trzyma je konfiguracja NextAuth, która przyjmuje
   * jedną ścieżkę, a nie funkcję zależną od żądania.
   */
  loginAlias: "/logowanie",
  registerAlias: "/rejestracja",
} as const;

/** Komplet adresów publicznych dla jednej wersji krajowej. */
export function publicRoutes(locale: Locale) {
  const segments = PUBLIC_SEGMENTS[locale];
  return {
    home: `/${locale}`,
    login: `/${locale}/${segments.login}`,
    register: `/${locale}/${segments.register}`,
  } as const;
}

/** Ścieżka logowania z adresem powrotu — w wariancie właściwym dla wersji. */
export function loginPathWithReturn(locale: Locale, returnTo: string): string {
  return `${publicRoutes(locale).login}?${RETURN_PARAM[locale]}=${encodeURIComponent(returnTo)}`;
}

/** Prefiksy wymagające zalogowania. */
export const PROTECTED_PREFIXES: string[] = [
  ROUTES.ownerDashboard,
  ROUTES.tenantDashboard,
  /*
    Middleware pilnuje tu wyłącznie zalogowania — o rolę pyta layout `/admin`,
    bo Edge nie ma dostępu do bazy, a rola z tokenu bywa o miesiąc spóźniona.
    Bez tego wpisu niezalogowany dostawałby przekierowanie na logowanie dopiero
    z Server Componentu, czyli po pobraniu całej strony.
  */
  ROUTES.adminDashboard,
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Strony, na które zalogowany użytkownik nie powinien wracać — w każdej wersji
 * krajowej naraz. Aliasy bez prefiksu też, bo prowadzą dokładnie tam samo.
 */
export const GUEST_ONLY_ROUTES: string[] = [
  ROUTES.loginAlias,
  ROUTES.registerAlias,
  ...LOCALES.flatMap((locale) => {
    const routes = publicRoutes(locale);
    return [routes.login, routes.register];
  }),
];

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Dokąd trafia użytkownik po zalogowaniu — zależnie od roli. */
export function landingPathForRole(role: string | undefined): string {
  return role === "TENANT" ? ROUTES.tenantDashboard : ROUTES.ownerDashboard;
}

/**
 * Wersja krajowa, do której należy publiczny adres.
 *
 * Zwraca `DEFAULT_LOCALE` dla ścieżek bez prefiksu — wołający używa tego tam,
 * gdzie i tak musi mieć jakiś język (np. do zbudowania adresu logowania).
 */
export function localeOfPath(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}
