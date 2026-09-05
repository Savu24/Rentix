/**
 * Wersje krajowe Rentiksa.
 *
 * Segment w adresie to **skrót kraju**, nie kod języka: `/pl` i `/uk`.
 * `uk` oznacza Wielką Brytanię (angielski), mimo że w ISO 639 `uk` to
 * ukraiński — wybór świadomy, bo `gb` jest dla odwiedzającego nieczytelne.
 * Kod języka pojawia się dopiero w `htmlLang` i `hreflang`, gdzie czytają
 * go maszyny.
 *
 * Plik nie importuje niczego — używa go middleware (runtime Edge), serwer
 * i przeglądarka.
 */

export const LOCALES = ["pl", "uk"] as const;

export type Locale = (typeof LOCALES)[number];

/** Wersja pokazywana, gdy nie da się rozpoznać kraju odwiedzającego. */
export const DEFAULT_LOCALE: Locale = "pl";

/** Ciasteczko z ostatnio oglądaną wersją — ma pierwszeństwo przed nagłówkiem. */
export const LOCALE_COOKIE = "rentix_kraj";

/**
 * Nagłówek, którym middleware podaje rozpoznaną wersję w głąb renderowania.
 * `layout.tsx` nie widzi ścieżki żądania, a ciasteczko ustawiane w tej samej
 * odpowiedzi jeszcze nie istnieje — nagłówek jest jedynym źródłem, które na
 * pierwszym wejściu na `/uk` mówi prawdę.
 */
export const LOCALE_HEADER = "x-rentix-kraj";

/**
 * Kraj odwiedzającego z sieci brzegowej Vercela („PL", „GB", „DE"…).
 *
 * Nagłówek dokłada infrastruktura, więc lokalnie i w testach go nie ma —
 * wtedy o wersji decyduje język przeglądarki, tak jak wcześniej.
 */
export const COUNTRY_HEADER = "x-vercel-ip-country";

/** Rok, bo to preferencja, a nie stan sesji. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type LocaleMeta = {
  /** Wartość atrybutu `lang` na <html> i klucz `hreflang`. */
  readonly htmlLang: string;
  /** Locale dla `Intl` — formatowanie kwot, dat i liczb. */
  readonly intl: string;
  /** Waluta ISO 4217. Obie mają setne części, więc arytmetyka w bazie się nie zmienia. */
  readonly currency: "PLN" | "GBP";
  /** Nazwa wersji we własnym języku — do przełącznika. */
  readonly label: string;
  /** Kod kraju do danych wystawcy dokumentów. */
  readonly countryCode: "PL" | "GB";
  /** Kody języków z `Accept-Language`, które kierujemy na tę wersję. */
  readonly acceptLanguage: readonly string[];
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  pl: {
    htmlLang: "pl",
    intl: "pl-PL",
    currency: "PLN",
    label: "Polska",
    countryCode: "PL",
    acceptLanguage: ["pl"],
  },
  uk: {
    htmlLang: "en-GB",
    intl: "en-GB",
    currency: "GBP",
    label: "United Kingdom",
    countryCode: "GB",
    // Angielski w dowolnej odmianie trafia na wersję brytyjską — to jedyna
    // anglojęzyczna, jaką mamy. Amerykanin zobaczy funty, ale zrozumie stronę;
    // odesłanie go na polską byłoby gorsze.
    acceptLanguage: ["en"],
  },
};

/**
 * Wybiera wersję po kraju, z którego przyszło żądanie.
 *
 * Kraj wyprzedza język przeglądarki: Polak z brytyjskim numerem telefonu
 * i brytyjskim najmem ma zobaczyć funty i tamtejsze prawo, choć jego telefon
 * mówi po polsku. Zwraca `null` dla krajów, których nie obsługujemy — wtedy
 * pytanie wraca do `Accept-Language`.
 */
export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;

  const code = country.trim().toUpperCase();
  return LOCALES.find((locale) => LOCALE_META[locale].countryCode === code) ?? null;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Wyciąga wersję krajową z pierwszego segmentu ścieżki.
 *
 * `/uk/login` → `"uk"`, `/panel/najemcy` → `null`. Panel celowo nie ma
 * prefiksu: po zalogowaniu o języku decyduje ustawienie konta, a nie adres —
 * inaczej każda z 38 stron panelu istniałaby w dwóch drzewach tras.
 */
export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

/** Ścieżka wewnątrz wersji krajowej: `("uk", "/login")` → `"/uk/login"`. */
export function localePath(locale: Locale, path = "/"): string {
  if (path === "/" || path === "") return `/${locale}`;
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Wybiera wersję na podstawie nagłówka `Accept-Language`.
 *
 * Prosty parser z wagami `q` — pełnej negocjacji BCP-47 nie potrzebujemy przy
 * dwóch wersjach, a biblioteka w middlewarze kosztowałaby więcej niż daje.
 * Zwraca `null`, gdy nagłówka nie ma albo nie pasuje nic znajomego; wołający
 * decyduje, czy sięgnąć po `DEFAULT_LOCALE`.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = quality ? Number.parseFloat(quality.slice(2)) : 1;

      return {
        // "en-GB" → "en"; wersję wybiera język, nie region.
        language: tag.trim().toLowerCase().split("-")[0],
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .filter((entry) => entry.language && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const entry of ranked) {
    const match = LOCALES.find((locale) =>
      LOCALE_META[locale].acceptLanguage.includes(entry.language),
    );
    if (match) return match;
  }

  return null;
}
