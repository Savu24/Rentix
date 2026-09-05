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

  panel: {
    nav: {
      dashboard: "Pulpit",
      properties: "Nieruchomości",
      propertiesShort: "Obiekty",
      tenants: "Najemcy",
      owners: "Właściciele",
      ownersShort: "Właśc.",
      leases: "Umowy",
      finance: "Finanse",
      reports: "Raporty",
      settings: "Ustawienia",
      settingsShort: "Konto",
    },

    dashboard: {
      title: "Pulpit",
      greeting: "Cześć, {name}",
      greetingFallback: "właścicielu",
      addProperty: "Dodaj nieruchomość",
      sellerIncomplete:
        "Uzupełnij dane wystawcy. Bez adresu rachunki i umowy wychodzą z samą nazwą.",
      goToSettings: "Przejdź do ustawień",
      emptyTitle: "Zacznij od pierwszej nieruchomości",
      emptyLead:
        "Dodaj mieszkanie lub dom, a potem jednostki najmu. Reszta, czyli najemcy, umowy i faktury, podepnie się pod nie.",
      statProperties: "Nieruchomości",
      statRooms: "Pokoje",
      statOccupancy: "Obłożenie",
      statOccupancyHint: "{occupied} z {total} zajętych",
      statArrears: "Zaległości",
      /** Liczba dokumentów po terminie — polski wymaga trzech form. */
      overdueInvoices: ["{count} faktura po terminie", "{count} faktury po terminie", "{count} faktur po terminie"],
      allSettled: "Wszystko rozliczone",
      propertiesCardLead: "Zarządzaj obiektami i jednostkami najmu.",
      goToList: "Przejdź do listy",
    },

    tabs: {
      financeAria: "Sekcje finansów",
      financeDocuments: "Dokumenty",
      financeExpenses: "Koszty",
      settingsAria: "Sekcje ustawień",
      settingsOrganization: "Organizacja",
      settingsNotifications: "Powiadomienia",
      settingsMessages: "Wiadomości",
      settingsAccount: "Konto",
    },

    propertiesPage: {
      title: "Nieruchomości",
      lead: "Obiekty i jednostki najmu w Twoim portfelu.",
      archived: "Zarchiwizowane",
      add: "Dodaj nieruchomość",
      noMatchTitle: "Nic nie pasuje do filtrów",
      noMatchLead:
        "Spróbuj innej frazy albo wyczyść filtry, żeby zobaczyć wszystkie nieruchomości.",
      emptyTitle: "Nie masz jeszcze żadnej nieruchomości",
      emptyLead:
        "Dodaj pierwszy obiekt, a potem jednostki najmu. Umowy, faktury i zgłoszenia podepną się pod nie.",
      newTitle: "Nowa nieruchomość",
      newLead: "Dodaj obiekt, a w kolejnym kroku jednostki najmu.",
      editTitle: "Edycja nieruchomości",
      archiveTitle: "Archiwum nieruchomości",
      badge: {
        underRefurbishment: "W remoncie",
        let: "Wynajęta",
        vacant: "Wolna",
        allLet: "Wszystkie zajęte",
        someVacant: "{available}/{total} wolnych",
      },
      /** Odmiana rzeczownika w archiwum: „2 nieruchomości przywrócono". */
      noun: ["nieruchomość", "nieruchomości", "nieruchomości"],
      filters: {
        searchPlaceholder: "Szukaj po nazwie, ulicy lub mieście…",
        searchLabel: "Szukaj nieruchomości",
        typeLabel: "Typ nieruchomości",
        allTypes: "Wszystkie typy",
        availabilityLabel: "Dostępność",
        all: "Wszystkie",
        vacant: "Z wolnymi",
        underRefurbishment: "W remoncie",
        occupied: "Wynajęte",
        counted: ["{count} nieruchomość", "{count} nieruchomości", "{count} nieruchomości"],
        clear: "Wyczyść filtry",
        filtering: "Filtrowanie…",
      },
      rooms: ["pokój", "pokoje", "pokoi"],
    },

    archive: {
      lead: "Zaznacz pozycje, żeby je przywrócić albo usunąć na zawsze.",
      empty:
        "Archiwum jest puste. Trafiają tu pozycje, które zarchiwizujesz. Nic nie znika bezpowrotnie, dopóki sam tego nie zdecydujesz.",
      restored: "Przywrócono {count} {noun}.",
      deleted: "Usunięto na zawsze {count} {noun}.",
      partialFailure: "Część pozycji została nietknięta:",
      selectAll: "Zaznacz wszystkie",
      deselectAll: "Odznacz wszystkie",
      nothingSelected: "Nic nie zaznaczono",
      selectedCount: "{count} {noun}",
      restore: "Przywróć",
      deleteForever: "Usuń trwale",
      confirmDelete: "Na pewno? Usuń trwale",
      deleteWarning:
        "Tego się nie cofnie. Nie ma kosza ani kopii. Pozycje powiązane z umowami albo fakturami zostaną pominięte, bo ich usunięcie zerwałoby historię rozliczeń.",
    },

    ownersPage: {
      title: "Właściciele",
      lead: "Właściciele lokali, które obsługujesz w podnajmie albo w zarządzaniu.",
      add: "Dodaj właściciela",
      addFirst: "Dodaj pierwszego właściciela",
      emptyTitle: "Nie masz jeszcze żadnego właściciela",
      emptyLead:
        "Dodaj właściciela, gdy wynajmujesz dalej cudze mieszkanie albo zarządzasz nim w jego imieniu. Przy własnych nieruchomościach ta lista zostaje pusta.",
      newTitle: "Nowy właściciel",
      editTitle: "Edycja właściciela",
      archiveTitle: "Archiwum właścicieli",
      archiveNote:
        "Właściciel z przypisanymi nieruchomościami nie da się usunąć trwale. Odepnij je najpierw.",
      archiveHint: "Zniknie z listy, ale jego nieruchomości i ich historia zostaną nietknięte.",
      archived: "Zarchiwizowane",
      archivedBadge: "Zarchiwizowany",
      companyBadge: "firma",
      propertyCount: ["{count} nieruchomość", "{count} nieruchomości", "{count} nieruchomości"],
      occupiedCount: "{count} wynajętych",
      archivedProperty: "Zarchiwizowana",
      bankAccountTerm: "Rachunek",
      contractTerm: "Umowa",
      notes: "Notatki",
      properties: "Nieruchomości",
      archiveLabel: "właściciela",
      contactSection: "Dane kontaktowe i rozliczeniowe",
      noContactData: "Nie uzupełniono jeszcze danych kontaktowych ani numeru rachunku.",
      noProperties:
        "Do tego właściciela nie przypisano jeszcze żadnej nieruchomości. Wskaż go w formularzu nieruchomości, w sekcji „Właściciel”.",
      noun: ["właściciel", "właścicieli", "właścicieli"],
      form: {
        title: "Dane właściciela",
        lead: "Właściciel lokalu, który obsługujesz w podnajmie. Nie jest stroną umowy z najemcą, tą pozostajesz Ty.",
        save: "Zapisz zmiany",
        owner: "Właściciel",
        ownerHint: "Imię i nazwisko albo nazwa firmy.",
        taxId: "NIP",
        taxIdHint: "Tylko dla firm.",
        email: "E-mail",
        phone: "Telefon",
        street: "Ulica i numer",
        postalCode: "Kod pocztowy",
        city: "Miejscowość",
        bankAccount: "Numer rachunku",
        bankAccountHint: "Na ten rachunek przekazujesz czynsz po potrąceniu prowizji.",
        contractFrom: "Umowa od",
        contractFromHint: "Początek umowy o zarządzanie tym lokalem.",
        contractTo: "Umowa do",
        contractToHint: "Puste = czas nieokreślony.",
        notes: "Notatki",
        notesHint: "Widoczne tylko dla Ciebie, np. warunki rozliczenia.",
      },
      picker: {
        label: "Właściciel lokalu",
        hint: "Zostaw puste, jeśli nieruchomość jest Twoja. Wypełnij przy podnajmie i zarządzaniu.",
        own: "Nieruchomość własna",
        addNew: "Nowy właściciel",
        addNewHint: "Zapisze się od razu i zostanie wybrany przy tej nieruchomości.",
      },
    },

    common: {
      cancel: "Anuluj",
      save: "Zapisz",
      saveChanges: "Zapisz zmiany",
      back: "Wróć",
      delete: "Usuń",
      edit: "Edytuj",
      archive: "Archiwizuj",
      restore: "Przywróć",
      loading: "Wczytywanie…",
      none: "—",
    },

    tenantsPage: {
      title: "Najemcy",
      count: ["{count} najemca", "{count} najemców", "{count} najemców"],
      withDebt: " · {count} z nierozliczonymi płatnościami",
      archived: "Zarchiwizowane",
      archivedBadge: "Zarchiwizowany",
      add: "Dodaj najemcę",
      emptyTitle: "Nie masz jeszcze żadnego najemcy",
      emptyLead: "Dodaj profil najemcy, żeby móc podpiąć go pod umowę najmu i wystawiać faktury.",
      noLease: "Bez umowy",
      overdueCount: "{count} po terminie",
      toPay: "do zapłaty",
      settled: "Rozliczony",
      sortAria: "Sortowanie najemców",
      newTitle: "Nowy najemca",
      newLead: "Wystarczy imię i nazwisko. Resztę uzupełnisz przy podpisywaniu umowy.",
      editTitle: "Edycja najemcy",
      archiveTitle: "Archiwum najemców",
      archiveNote:
        "Najemca z historią umów nie da się usunąć trwale. Jego dane widnieją na wystawionych dokumentach.",
      noun: ["najemcę", "najemców", "najemców"],
    },

    archiveAction: {
      restore: "Przywróć z archiwum",
      archiveWithLabel: "Zarchiwizuj {label}",
      archive: "Archiwizuj",
    },

    leasesPage: {
      title: "Umowy",
      count: ["{count} umowa", "{count} umowy", "{count} umów"],
      activeSuffix: " · {count} aktywnych",
      archived: "Zarchiwizowane",
      add: "Nowa umowa",
      addFirst: "Utwórz pierwszą umowę",
      emptyTitle: "Nie masz jeszcze żadnej umowy",
      emptyLead: "Umowa łączy jednostkę najmu z najemcą i jest podstawą do naliczania czynszu.",
      roomLet: "Najem pokoju",
      arrears: ["{count} zaległość", "{count} zaległości", "{count} zaległości"],
      openEnded: "bezterminowo",
      numberPrefix: "nr {number}",
      perMonth: "miesięcznie",
      newTitle: "Nowa umowa najmu",
      newLead: "Po zapisaniu wygenerujesz gotowy PDF do podpisu.",
      newLeadNoDocument: "Warunki najmu w jednym miejscu, gotowe do naliczania czynszu.",
      missingPrefix: "Zanim utworzysz umowę, dodaj {what}.",
      missingProperty: "nieruchomość",
      missingTenant: "najemcę",
      missingJoin: " i ",
      needProperty: "Dodaj nieruchomość",
      needTenant: "Dodaj najemcę",
      archiveTitle: "Archiwum umów",
      archiveNote:
        "Umowy z wystawionymi dokumentami nie da się usunąć trwale. Faktury i wpłaty zostają, bo to historia rozliczeń.",
      archiveItemNumber: ", nr {number}",
      archiveItemFrom: "{status} · od {date}",
      noun: ["umowę", "umowy", "umów"],
      terminate: {
        button: "Zakończ umowę",
        title: "Zakończenie umowy",
        lead: "Jednostka wróci do puli wolnych, a najemcy zmienią status na „były najemca”.",
        endDate: "Data zakończenia",
        note: "Powód / uwagi",
        noteHint: "Opcjonalne.",
      },
      extend: {
        button: "Przedłuż umowę",
        title: "Przedłużenie umowy",
        presets: { months3: "o 3 miesiące", months6: "o pół roku", months12: "o rok" },
        current: "Obecnie do {date}. Zmienia się wyłącznie data zakończenia, czynsz i pozostałe warunki zostają.",
        presetUntil: "{label} · do {date}",
        customDate: "Albo własna data",
      },
      activate: {
        reserved: "Rezerwacja czeka na start",
        draft: "Szkic umowy",
      },
      activateButton: "Aktywuj umowę",
      activateLead:
        "Umowa ze statusem {status} nie zajmuje lokalu i nie jest naliczana. Po aktywacji jednostka staje się zajęta, a najemcy czynni.",
      emailToggle: {
        label: "Wysyłaj rachunki mailem",
        off: "Wyłączone: dokumenty nie pójdą nocnym przebiegiem. Ręczna wysyłka z widoku rachunku działa dalej.",
      },
      billingStart: {
        label: "Nie naliczaj przed",
        hint: "Miesiące rozliczone w poprzednim programie. Puste = naliczaj od początku umowy.",
      },
    },

    financePage: {
      title: "Finanse",
      lead: "Dokumenty rozliczeniowe i wpłaty najemców.",
      expensesLead: "Wydatki właściciela. Bez nich raport pokaże przychód, ale nie zysk.",
      unpaid: "Do zapłaty",
      unpaidDocs: ["{count} dokument", "{count} dokumenty", "{count} dokumentów"],
      arrears: "Zaległości",
      overdueCount: "{count} po terminie",
      paidThisMonth: "Wpłaty w tym miesiącu",
      paidHint: "suma zaksięgowanych wpłat",
      noMatchTitle: "Żaden dokument nie pasuje do filtrów",
      noMatchLead: "Zmień kryteria albo wyczyść filtry, żeby zobaczyć wszystkie dokumenty.",
      emptyTitle: "Nie ma jeszcze dokumentów",
      emptyLead:
        "Czynsz nalicza się automatycznie w dniu wskazanym w umowie. Możesz też naliczyć wybrany miesiąc ręcznie.",
      expensesTitle: "Koszty",
      expensesTotal: "Suma kosztów w widoku",
      expensesNoMatchTitle: "Żaden koszt nie pasuje do filtrów",
      expensesNoMatchLead: "Zmień kryteria albo wyczyść filtry.",
      expensesEmptyTitle: "Nie ma jeszcze kosztów",
      expensesEmptyLead:
        "Wpisz czynsz do wspólnoty, ratę kredytu, remonty i ubezpieczenie. Dopiero wtedy raport policzy zysk, a nie sam przychód.",
      editExpense: "Edytuj koszt",
      deleteExpense: "Usuń koszt",
      dueOn: "termin {date}",
      remainingAmount: "zostało {amount}",
      markPaid: "Oznacz jako opłaconą: {amount}",
      downloadSelected: "Pobierz zaznaczone",
      documentNoun: ["dokument", "dokumenty", "dokumentów"],
      downloadCount: "Pobierz {count} {noun}",
      download: "Pobierz",
      selectForDownload: "Zaznacz do pobrania",
      finishSelecting: "Zakończ zaznaczanie",
      selectAll: "Zaznacz wszystkie",
      deselectAll: "Odznacz wszystkie",
      nothingSelected: "Nic nie zaznaczono",
    },

    dateInput: {
      placeholder: "dd.mm.rrrr",
      openCalendar: "Wybierz z kalendarza",
    },
    shell: {
      navAria: "Nawigacja panelu",
      mobileNavAria: "Nawigacja mobilna",
      menu: "Menu",
      more: "Więcej",
      closeMenu: "Zamknij menu",
      soon: "wkrótce",
      soonTitle: "Moduł w przygotowaniu",
      notifications: "Powiadomienia",
      signOut: "Wyloguj",
      fallbackAccountName: "Konto",
      planFree: "Plan Free",
      planPro: "Plan Pro",
    },

    validation: {
      maxChars: "Maksymalnie {max} znaków",
      /**
       * Etykiety mają różny rodzaj gramatyczny („Nazwa" żeński, „Numer" męski,
       * „Oznaczenie" nijaki), więc komunikat nie może odmieniać się razem
       * z nimi. „Pole …" jest nijakie i uzgadnia się z każdą etykietą.
       */
      required: "Pole „{label}” jest wymagane",
      postalCode: "Kod pocztowy w formacie 00-000",
      phone: "Numer telefonu wygląda nieprawidłowo",
      taxId: "NIP składa się z 10 cyfr",
      bankAccount: "Numer rachunku to 26 cyfr",
      money: "{label} musi być kwotą, np. 2 400,50",
      moneyNegative: "{label} nie może być ujemna",
      moneyTooHigh: "{label} wygląda na zawyżoną",
      notNumber: "{label} musi być liczbą",
      notInteger: "{label} musi być liczbą całkowitą",
      tooHigh: "{label} nie może przekraczać {max}",
      outOfRange: "{label} musi mieścić się w zakresie {min}–{max}",
      missingId: "Brak identyfikatora",
      dateFormat: "{label}: podaj datę w formacie RRRR-MM-DD",
      dateInvalid: "{label}: taka data nie istnieje",
    },

    owners: {
      fields: {
        name: "Nazwa właściciela",
        contractStart: "Data rozpoczęcia umowy",
        contractEnd: "Data zakończenia umowy",
      },
      contractPeriodOrder: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
      period: {
        range: "{start} – {end}",
        openEnded: "od {start}, czas nieokreślony",
        until: "do {end}",
      },
    },

    expenses: {
      fields: {
        amount: "Kwota",
        paidAt: "Data poniesienia",
        description: "Opis",
        interval: "Odstęp",
      },
      amountPositive: "Kwota musi być większa od zera",
      customIntervalRequired: "Podaj, co ile dni wraca ten koszt",
      everyDays: "co {days} dni",
      category: {
        MORTGAGE: "Rata kredytu",
        RENT: "Wynajem",
        COMMUNITY_FEE: "Czynsz do wspólnoty",
        UTILITIES: "Media",
        REPAIR: "Naprawa i remont",
        FURNISHING: "Wyposażenie",
        INSURANCE: "Ubezpieczenie",
        PROPERTY_TAX: "Podatek od nieruchomości",
        INCOME_TAX: "Podatek od najmu",
        MANAGEMENT: "Zarządzanie i pośrednictwo",
        ACCOUNTING: "Księgowość",
        LEGAL: "Obsługa prawna",
        OTHER: "Inne",
      },
      recurrence: {
        WEEKLY: "Co tydzień",
        MONTHLY: "Co miesiąc",
        YEARLY: "Co rok",
        CUSTOM: "Niestandardowo",
      },
    },

    settings: {
      fields: {
        organizationName: "Nazwa",
        userName: "Imię i nazwisko",
      },
      seller: {
        title: "Dane wystawcy",
        lead: "Trafiają na rachunki jako sprzedawca i na umowy najmu jako wynajmujący.",
        saved: "Zapisano dane wystawcy.",
        save: "Zapisz",
        name: "Nazwa",
        nameHint: "Firma albo imię i nazwisko, jeśli wynajmujesz prywatnie.",
        contactEmail: "Adres kontaktowy dla najemców",
        contactEmailHint:
          "Tu trafi odpowiedź, gdy najemca odpisze na powiadomienie o płatności.",
        taxId: "NIP",
        taxIdHint: "Zostaw puste, jeśli wynajmujesz jako osoba fizyczna.",
        street: "Ulica i numer",
        postalCode: "Kod pocztowy",
        city: "Miejscowość",
        bankAccount: "Numer rachunku dla najemców",
        bankAccountHint:
          "26 cyfr. Trafia na rachunki jako konto do przelewu. Zostaw puste, jeśli rozliczasz się inaczej.",
      },
      logoTooLarge: "Plik jest za duży",
      logoWrongType: "Wgraj obrazek PNG albo JPEG",
      logoMaxSize: "Obrazek może ważyć najwyżej {kb} kB",
      phoneInvalid: "Numer telefonu wygląda nieprawidłowo",
      currentPasswordRequired: "Podaj obecne hasło",
      newPasswordSame: "Nowe hasło musi różnić się od obecnego",
      passwordToConfirm: "Podaj hasło, żeby potwierdzić",
      /** Frazę trzeba przepisać ręcznie — kliknięcie „tak" idzie odruchowo. */
      deletePhrase: "USUWAM KONTO",
      deleteConfirmation: "Przepisz dokładnie: {phrase}",
      wholeDays: "Podaj pełne dni",
      reminderTooEarly: "Więcej niż 30 dni przed terminem to za wcześnie",
      reminderTooLate: "Przypomnienie musi wyprzedzać termin o co najmniej dzień",
      overdueTooOften: "Codzienne wezwania trafiają do spamu, ustaw co najmniej 2 dni",
      overdueTooRare: "Rzadziej niż co 60 dni wezwanie przestaje być wezwaniem",
      unknownVariables: "Nieznane zmienne: {names}. Sprawdź listę pod polem.",
    },

    api: {
      invalidJson: "Treść żądania musi być poprawnym JSON-em.",
      notFound: {
        owner: "Nie znaleziono właściciela.",
        archivedOwner: "Nie znaleziono zarchiwizowanego właściciela.",
        property: "Nie znaleziono nieruchomości.",
        archivedProperty: "Nie znaleziono zarchiwizowanej nieruchomości.",
        room: "Nie znaleziono pokoju.",
        tenant: "Nie znaleziono najemcy.",
        archivedTenant: "Nie znaleziono zarchiwizowanego najemcy.",
        lease: "Nie znaleziono umowy.",
        archivedLease: "Nie znaleziono zarchiwizowanej umowy.",
        invoice: "Nie znaleziono dokumentu.",
        payment: "Nie znaleziono wpłaty.",
        expense: "Nie znaleziono kosztu.",
        organization: "Nie znaleziono organizacji.",
        account: "Nie znaleziono konta.",
        invoices: "Nie znaleziono dokumentów.",
        selectedTenant: "Nie znaleziono wskazanego najemcy.",
        roomInProperty: "Nie znaleziono pokoju w tej nieruchomości.",
        propertyRooms: "Nie znaleziono pokoi tej nieruchomości.",
      },
      fixFields: "Popraw zaznaczone pola.",
      noInvoiceSelected: "Nie wskazano żadnego dokumentu.",
      alreadyCancelled: "Ten dokument jest już anulowany.",
      cancelledNotSent: "Dokument jest anulowany. Nie wysyłamy go najemcy.",
      noAccountEmail: "Twoje konto nie ma adresu e-mail, na który wysłać test.",
    },

    invoices: {
      fields: {
        lineDescription: "Opis pozycji",
        unitPrice: "Cena jednostkowa",
        issueDate: "Data wystawienia",
        saleDate: "Data sprzedaży",
        dueDate: "Termin płatności",
        periodStart: "Początek okresu",
        periodEnd: "Koniec okresu",
        paymentAmount: "Kwota wpłaty",
        paymentDate: "Data wpłaty",
      },
      quantityNotNumber: "Ilość musi być liczbą",
      quantityPositive: "Ilość musi być większa od zera",
      quantityTooHigh: "Ilość wygląda na zawyżoną",
      unitMaxChars: "Maksymalnie 12 znaków",
      /** Domyślna jednostka pozycji na dokumencie. */
      defaultUnit: "szt.",
      linesRequired: "Dokument musi mieć przynajmniej jedną pozycję",
      linesTooMany: "Maksymalnie 50 pozycji na dokumencie",
      dueBeforeIssue: "Termin płatności nie może być wcześniejszy niż data wystawienia",
      periodOrder: "Koniec okresu nie może być wcześniejszy niż jego początek",
      paymentPositive: "Kwota wpłaty musi być większa od zera",
      kind: {
        BILL: "Rachunek",
        VAT_INVOICE: "Faktura VAT",
        PROFORMA: "Proforma",
        CHARGE: "Naliczenie",
      },
      vat: {
        ZW: "zw.",
        NP: "np.",
        RATE_0: "0%",
        RATE_5: "5%",
        RATE_8: "8%",
        RATE_23: "23%",
      },
      method: {
        TRANSFER: "Przelew",
        CASH: "Gotówka",
        CARD: "Karta",
        DIRECT_DEBIT: "Polecenie zapłaty",
        OTHER: "Inna",
      },
    },

    tenants: {
      fields: {
        firstName: "Imię",
        lastName: "Nazwisko",
        dateOfBirth: "Data urodzenia",
        registeredUntil: "Koniec zameldowania",
        employmentUntil: "Koniec pracy lub studiów",
        insuranceExpiresAt: "Ważność polisy",
      },
      identity: {
        idCard: "Numer dowodu to trzy litery i sześć cyfr, np. ABC123456",
        nationalId: "PESEL składa się z 11 cyfr",
        passport: "Numer paszportu wygląda nieprawidłowo",
      },
      status: {
        PROSPECT: "Zainteresowany",
        ACTIVE: "Aktywny",
        FORMER: "Były najemca",
      },
      legalForm: {
        INDIVIDUAL: "Osoba fizyczna",
        COMPANY: "Firma",
      },
      documentKindHint: {
        BILL: "Rachunek, a przy pozycji z VAT-em faktura. Domyślne i pasuje większości najmu mieszkaniowego.",
        VAT_INVOICE: "Zawsze faktura VAT, także przy stawce zwolnionej. Dla najemcy-firmy, który tego wymaga.",
        CHARGE: "Samo naliczenie, czyli informacja o kwocie do zapłaty. NIE jest dowodem księgowym i ma osobną numerację.",
      },
      sort: {
        name: "Nazwisko",
        address: "Adres mieszkania",
        debt: "Zaległość",
        leaseStatus: "Status umowy",
      },
    },

    leases: {
      leaseDocument: {
        download: "Pobierz PDF",
        unavailable: "",
      },
      fields: {
        startDate: "Data rozpoczęcia",
        endDate: "Data zakończenia",
        newEndDate: "Nowa data zakończenia",
        rent: "Czynsz",
        deposit: "Kaucja",
        utilitiesAdvance: "Zaliczka na media",
        billingStartsAt: "Nie naliczaj przed",
      },
      propertyRequired: "Wybierz nieruchomość",
      tenantRequired: "Wskaż przynajmniej jednego najemcę",
      tenantsTooMany: "Maksymalnie sześciu najemców na umowie",
      tenantDuplicate: "Ten sam najemca został wskazany dwa razy",
      endBeforeStart: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
      advanceRequired: "Przy zaliczce na media podaj jej kwotę",
      billingDayInteger: "Dzień naliczania musi być liczbą całkowitą",
      billingDayRange: "Dzień naliczania musi mieścić się w zakresie 1–28",
      paymentTermInteger: "Termin płatności musi być liczbą całkowitą",
      paymentTermNegative: "Termin płatności nie może być ujemny",
      paymentTermTooLong: "Termin płatności nie może przekraczać 90 dni",
      status: {
        DRAFT: "Szkic",
        RESERVED: "Rezerwacja",
        ACTIVE: "Aktywna",
        TERMINATED: "Wypowiedziana",
        EXPIRED: "Wygasła",
      },
      utilitiesMode: {
        INCLUDED: "Media w czynszu",
        FLAT_RATE: "Stała zaliczka",
        METERED: "Wg liczników",
        MIXED: "Zaliczka + rozliczenie",
      },
      utilitiesHint: {
        INCLUDED: "Faktura zawiera wyłącznie czynsz.",
        FLAT_RATE: "Do czynszu doliczana jest stała zaliczka na media.",
        METERED: "Pozycje za media powstają z odczytów liczników.",
        MIXED: "Zaliczka co miesiąc, rozliczenie po odczytach.",
      },
      utilitiesIncomplete: {
        METERED:
          "Odczytów liczników nie da się jeszcze wpisać w Rentiksie, więc rozliczenie obejmie sam czynsz. Pozycje za media dolicz na razie poza systemem.",
        MIXED:
          "Zaliczka na media będzie naliczana normalnie, ale rozliczenia po odczytach liczników Rentix jeszcze nie zrobi.",
      },
    },

    properties: {
      fields: {
        name: "Nazwa",
        street: "Ulica",
        buildingNumber: "Numer budynku",
        city: "Miejscowość",
        area: "Powierzchnia",
        floor: "Piętro",
        askingRent: "Czynsz za całość",
        internetSpeed: "Prędkość łącza",
        internetContractEnd: "Koniec umowy na internet",
        energyIndex: "Wskaźnik EP",
        certificateValidUntil: "Ważność świadectwa",
        boilerInspection: "Przegląd pieca",
        technicalInspection: "Przegląd techniczny",
        transitDistance: "Odległość od przystanku",
        universityDistance: "Odległość od uczelni",
        roomName: "Oznaczenie pokoju",
        roomRent: "Czynsz za pokój",
      },
      checkoutTimeFormat: "Godzina w formacie GG:MM, np. 11:00",
      checkoutTimeInvalid: "Taka godzina nie istnieje",
      coordinatesFormat: "Współrzędne w formacie 52.2297, 21.0122",
      coordinatesRange: "Szerokość mieści się w ±90, długość w ±180",
      roomCountInteger: "Liczba pokoi musi być liczbą całkowitą",
      roomCountTooMany: "Maksymalnie {max} pokoi naraz",
      /** Domyślne nazwy pokoi przy zakładaniu: „Pokój 1", „Pokój 2"… */
      defaultRoomName: "Pokój {number}",
      type: {
        APARTMENT: "Mieszkanie",
        HOUSE: "Dom",
        ROOM: "Pokój",
        COMMERCIAL: "Lokal użytkowy",
        PARKING: "Miejsce postojowe",
        STORAGE: "Komórka lokatorska",
        BUILDING: "Budynek",
      },
      rentalStatus: {
        AVAILABLE: "Wolne",
        OCCUPIED: "Wynajęte",
        UNAVAILABLE: "W remoncie",
      },
      heating: {
        DISTRICT: "Miejskie",
        GAS: "Gazowe",
        ELECTRIC: "Elektryczne",
        HEAT_PUMP: "Pompa ciepła",
        SOLID_FUEL: "Paliwo stałe",
        OTHER: "Inne",
      },
    },
  },
  documents: {
    invoice: {
      batchTitle: "Dokumenty rozliczeniowe ({count})",
      cancelled: " (ANULOWANY)",
      numberPrefix: "nr ",
      issueDate: "Data wystawienia",
      saleDate: "Data sprzedaży",
      dueDate: "Termin płatności",
      seller: "Sprzedawca",
      buyer: "Nabywca",
      taxIdLabel: "NIP",
      subject: "Dotyczy: {subject}",
      period: "Okres rozliczeniowy: {from} – {to}",
      noDate: "brak",
      columns: {
        index: "#",
        description: "Nazwa usługi",
        quantity: "Ilość",
        unitPrice: "Cena netto",
        vat: "VAT",
        net: "Netto",
        gross: "Brutto",
        amount: "Wartość",
      },
      breakdown: "Netto {rate} · VAT {vat}",
      totalNet: "Razem netto",
      totalVat: "Razem VAT",
      totalDue: "Do zapłaty",
      /**
       * Kwota słownie jest wymogiem polskiej faktury. Pusty tekst wyłącza ten
       * wiersz — w brytyjskim rachunku nie ma czego nim potwierdzać.
       */
      amountInWords: "Słownie: ",
      sortCode: "",
      accountNumber: "",
      paymentLabel: "Płatność przelewem na rachunek",
      paymentReference: "",
      paidSoFar: "Wpłacono",
      remaining: "Pozostaje do zapłaty",
      chargeDisclaimer:
        "Naliczenie ma charakter informacyjny. Wskazuje kwotę i termin płatności. Nie jest fakturą ani rachunkiem w rozumieniu przepisów o rachunkowości i nie stanowi podstawy do księgowania ani odliczenia podatku. Dokument księgowy wystawiamy na życzenie.",
      signedBy: "Wystawił",
      receivedBy: "Odebrał",
    },
    numberPrefix: {
      BILL: "R",
      VAT_INVOICE: "FV",
      PROFORMA: "PF",
      CHARGE: "N",
    },
  },

  emails: {
    attachmentNote: "Dokument w formacie PDF znajdziesz w załączniku tej wiadomości.",
    attachmentPlain: "Dokument PDF jest w załączniku tej wiadomości.",
    automaticFooter: "wiadomość wysłana automatycznie z systemu Rentix",

    rows: {
      number: "Numer",
      amount: "Kwota",
      amountDue: "Do zapłaty",
      dueDate: "Termin płatności",
      due: "Termin",
      wasDue: "Termin minął",
    },

    /** Odmiana „dzień / dni" w zdaniu o zaległości. */
    days: ["dzień", "dni", "dni"],

    issued: {
      subject: "{number}: {amount} do {due}",
      heading: "Nowy dokument",
      intro: "Dzień dobry, {name}. Wystawiliśmy dokument rozliczeniowy{period}.",
      introPeriod: " za {period}",
      outro: "Jeśli płatność została już wykonana, prosimy potraktować tę wiadomość jako informacyjną.",
    },

    reminder: {
      subject: "Przypomnienie: {number}, termin {due}",
      heading: "Zbliża się termin",
      intro: "Dzień dobry, {name}. Przypominamy o zbliżającym się terminie płatności.",
      outro: "Jeśli przelew jest już w drodze, prosimy zignorować tę wiadomość.",
    },

    overdue: {
      subject: "Zaległość: {number}, {amount}",
      heading: "Płatność po terminie",
      intro:
        "Dzień dobry, {name}. Termin płatności minął {days} {dayWord} temu, a wpłata nie została jeszcze odnotowana.",
      outro:
        "Jeśli płatność została wykonana w ciągu ostatnich dni, prosimy o kontakt. Sprawdzimy, czy wpłata do nas dotarła.",
    },

    /**
     * Nazwy zmiennych, których wynajmujący używa w swojej treści.
     *
     * Idą za językiem konta, bo wpisuje je człowiek: `{{imie_najemcy}}`
     * w angielskim edytorze byłoby zagadką, a nie podpowiedzią.
     */
    variables: {
      tenantFirstName: { name: "imie_najemcy", description: "Imię najemcy", example: "Jan" },
      tenantLastName: {
        name: "nazwisko_najemcy",
        description: "Nazwisko najemcy",
        example: "Kowalski",
      },
      landlordName: {
        name: "nazwa_wynajmujacego",
        description: "Twoja nazwa albo nazwa firmy",
        example: "Miret sp. z o.o.",
      },
      documentNumber: {
        name: "numer_dokumentu",
        description: "Numer rachunku",
        example: "R 6/08/2026",
      },
      amount: { name: "kwota", description: "Kwota dokumentu", example: "629,03 zł" },
      amountDue: {
        name: "do_zaplaty",
        description: "Kwota pozostała do zapłaty",
        example: "629,03 zł",
      },
      dueDate: { name: "termin", description: "Termin płatności", example: "22 sierpnia 2026" },
      period: { name: "okres", description: "Okres rozliczeniowy", example: "sierpień 2026" },
      daysOverdue: {
        name: "dni_po_terminie",
        description: "Ile dni minęło od terminu",
        example: "5",
      },
      propertyAddress: {
        name: "adres_lokalu",
        description: "Adres wynajmowanego lokalu",
        example: "Długa 14/3, 30-001 Kraków",
      },
    },
  },

  billing: {
    rentLine: "Czynsz najmu za {period}",
    rentLineProrated: "Czynsz najmu za {period} ({covered}/{total} dni)",
    utilitiesLine: "Zaliczka na media za {period}",
    utilitiesLineProrated: "Zaliczka na media za {period} ({covered}/{total} dni)",
    unitMonth: "mies.",
    invoiceNote: "Rozliczenie za {period}.",
  },

};
