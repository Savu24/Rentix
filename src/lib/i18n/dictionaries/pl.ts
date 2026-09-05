/**
 * Polska wersja tekstów. To ona jest źródłem typu `Dictionary`, więc każdy
 * brakujący klucz w innym języku wywraca `tsc`, a nie stronę u użytkownika.
 *
 * Zasada: w słowniku siedzi tekst, nie układ. Miejsca zmienne oznaczamy
 * `{nazwa}` i wypełniamy przez `fill()`, odmiana przez liczbę wchodzi tablicą
 * wariantów w kolejności: pojedyncza, mnoga, dopełniacz.
 */
export const pl = {
  common: {
    /** Nazwa wersji w przełączniku — zawsze we własnym języku. */
    localeName: "Polska",
    switchLocaleLabel: "Wersja krajowa",
    homeAriaLabel: "RentixON, strona główna",
    themeToLight: "Włącz tryb jasny",
    themeToDark: "Włącz tryb ciemny",
  },

  marketing: {
    metaTitle: "Rentix · zarządzanie najmem bez Excela",
    metaDescription:
      "Umowy, rachunki, płatności i raporty finansowe w jednym miejscu. Bez korporacyjnego interfejsu i bez cen rosnących z każdym mieszkaniem.",

    nav: {
      features: "Funkcje",
      pricing: "Cennik",
      login: "Zaloguj się",
      /** Kotwice w adresie — po polsku, bo widać je w pasku po kliknięciu. */
      featuresAnchor: "funkcje",
      pricingAnchor: "cennik",
    },

    hero: {
      badge: "Zarządzanie najmem, po ludzku",
      titleLead: "Zarządzaj ",
      titleMark: "najmem",
      titleTail: "bez Excela i przepłacania",
      lead: "Umowy, rachunki, płatności i raporty finansowe w jednym, prostym miejscu. Bez korporacyjnego interfejsu i bez cen rosnących z każdym mieszkaniem.",
      primaryCta: "Załóż darmowe konto →",
      secondaryCta: "Zobacz cennik",
      note: "Bez karty kredytowej · Konfiguracja w 10 minut",
    },

    preview: {
      title: "Przegląd miesiąca",
      period: "SIE 2026",
      income: "Przychód",
      occupancy: "Obłożenie",
      disclaimer: "Podgląd panelu na danych przykładowych",
    },

    features: {
      heading: "Wszystko w jednym miejscu",
      lead: "Cztery filary codziennej pracy właściciela. Bez przełączania się między narzędziami.",
      items: [
        {
          id: "leases",
          title: "Umowy najmu",
          description:
            "Kreator umowy z danymi z kartoteki i gotowym PDF-em do podpisu, z polskimi znakami i kwotą słownie.",
        },
        {
          id: "payments",
          title: "Czynsz i płatności",
          description:
            "Rachunki naliczają się same w dniu z umowy. Statusy opłacone i zaległe, przypomnienia mailem do najemcy.",
        },
        {
          id: "costs",
          title: "Koszty najmu",
          description:
            "Rata kredytu, wspólnota, remonty i ubezpieczenie w jednym rejestrze, z podziałem na nieruchomości.",
        },
        {
          id: "reports",
          title: "Raporty finansowe",
          description:
            "Przychód, koszty i wynik wg nieruchomości. Zestawienie roczne kasowo i eksport CSV dla księgowego.",
        },
      ],
    },

    pricing: {
      heading: "Prosty cennik, bez pułapek",
      badge: "BEZ LIMITÓW",
      free: {
        name: "Free",
        price: "0 zł",
        period: "",
        note: "do 20 najemców",
        items: ["Umowy i dokumenty", "Rachunki i przypomnienia", "Koszty i zestawienie roczne"],
        cta: "Zacznij za darmo",
      },
      pro: {
        name: "Pro",
        price: "149 zł",
        period: "/mies.",
        note: "bez limitu nieruchomości i najemców",
        items: ["Wszystko z Free", "Raporty i eksport księgowy", "Wielu użytkowników zespołu"],
        cta: "Przejdź na Pro",
      },
    },

    closing: {
      titleFirstLine: "Przenieś swój najem",
      titleSecondLine: "z Excela do Rentiksa",
      lead: "Pierwsze 20 najemców za darmo, na zawsze.",
      cta: "Załóż darmowe konto →",
    },

    footer: {
      rights: "© 2026 Rentix. Wszystkie prawa zastrzeżone.",
    },
  },

  auth: {
    login: {
      metaTitle: "Logowanie",
      metaDescription: "Zaloguj się do panelu Rentix.",
      heading: "Zaloguj się",
      noAccount: "Nie masz jeszcze konta?",
      registerLink: "Załóż je za darmo",
      google: "Zaloguj się przez Google",
      divider: "albo",
      email: "Adres e-mail",
      password: "Hasło",
      submit: "Zaloguj się",
      submitting: "Logowanie…",
    },

    register: {
      metaTitle: "Załóż konto",
      metaDescription: "Załóż darmowe konto Rentix. Pierwsze 20 najemców za darmo.",
      heading: "Załóż darmowe konto",
      hasAccount: "Masz już konto?",
      loginLink: "Zaloguj się",
      google: "Załóż konto przez Google",
      name: "Imię i nazwisko",
      organizationName: "Nazwa firmy lub konta",
      organizationHint: "Widoczna na fakturach i na publicznej stronie ofert.",
      email: "Adres e-mail",
      password: "Hasło",
      passwordHint: "Minimum 10 znaków, w tym wielka litera i cyfra.",
      submit: "Załóż darmowe konto",
      submitting: "Zakładanie konta…",
      terms:
        "Zakładając konto akceptujesz regulamin i politykę prywatności Rentix. Bez karty kredytowej. Pierwsze 20 najemców za darmo, na zawsze.",
      failed: "Nie udało się założyć konta. Spróbuj ponownie za chwilę.",
      emailTaken: "Konto z tym adresem e-mail już istnieje.",
      emailTakenField: "Ten adres jest już zajęty",
    },

    errors: {
      rateLimited: "Zbyt wiele prób logowania. Odczekaj 15 minut i spróbuj ponownie.",
      invalidCredentials: "Nieprawidłowy e-mail lub hasło.",
      oauthAccountNotLinked:
        "Ten adres jest już przypisany do konta z hasłem. Zaloguj się hasłem, a Google podepniesz później.",
      oauthFailed:
        "Logowanie przez Google nie doszło do skutku. Spróbuj ponownie albo użyj hasła.",
      accessDenied:
        "Nie udzieliłeś Google zgody na przekazanie danych, więc logowanie zostało przerwane.",
      unknown: "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.",
    },

    validation: {
      passwordTooShort: "Hasło musi mieć co najmniej 10 znaków",
      passwordTooLong: "Hasło może mieć najwyżej 128 znaków",
      passwordNeedsLower: "Hasło musi zawierać małą literę",
      passwordNeedsUpper: "Hasło musi zawierać wielką literę",
      passwordNeedsDigit: "Hasło musi zawierać cyfrę",
      emailRequired: "Podaj adres e-mail",
      emailTooLong: "Adres e-mail jest za długi",
      emailInvalid: "Nieprawidłowy adres e-mail",
      passwordRequired: "Podaj hasło",
      nameRequired: "Podaj imię i nazwisko",
      nameTooLong: "Imię i nazwisko jest za długie",
      organizationRequired: "Podaj nazwę firmy lub swoje imię i nazwisko",
      organizationTooLong: "Nazwa jest za długa",
    },
  },
};
