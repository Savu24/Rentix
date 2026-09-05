import type { Dictionary } from "../types";

/**
 * Wersja brytyjska.
 *
 * To nie jest tłumaczenie polskich zdań, tylko osobny tekst pisany pod inny
 * rynek. Świadome różnice w treści:
 *
 * • Umowa najmu — polska wersja obiecuje gotowy PDF do podpisu. Brytyjska nie,
 *   bo umowa (AST), ochrona kaucji w schemacie depozytowym i Right to Rent to
 *   inne prawo, którego Rentix nie zaszywa w kodzie. Karta mówi o ewidencji
 *   najmu, a nie o dokumencie do podpisu.
 * • „Kwota słownie" i polskie znaki na fakturze — wymóg polskiej faktury,
 *   po brytyjsku nie znaczy nic, więc znika.
 * • Zestawienie roczne opisujemy jako roczne, a nie podatkowe: brytyjski rok
 *   podatkowy biegnie od 6 kwietnia i obiecywanie go byłoby nieprawdą.
 */
export const uk: Dictionary = {
  common: {
    localeName: "United Kingdom",
    switchLocaleLabel: "Country",
    homeAriaLabel: "RentixON, home",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
  },

  marketing: {
    metaTitle: "Rentix · lettings management without the spreadsheet",
    metaDescription:
      "Tenancies, rent invoices, payments and financial reports in one place. No enterprise interface, and no price that climbs with every property.",

    nav: {
      features: "Features",
      pricing: "Pricing",
      login: "Log in",
      featuresAnchor: "features",
      pricingAnchor: "pricing",
    },

    hero: {
      badge: "Lettings management, in plain English",
      titleLead: "Run your ",
      titleMark: "lettings",
      titleTail: "without spreadsheets",
      lead: "Tenancies, rent invoices, payments and financial reports in one simple place. No enterprise interface, and no price that climbs with every property.",
      primaryCta: "Create a free account →",
      secondaryCta: "See pricing",
      note: "No credit card · Set up in 10 minutes",
    },

    preview: {
      title: "This month",
      period: "AUG 2026",
      income: "Income",
      occupancy: "Occupancy",
      disclaimer: "Dashboard preview with sample data",
    },

    features: {
      heading: "Everything in one place",
      lead: "The four things a landlord does every week. Without switching between tools.",
      items: [
        {
          id: "leases",
          title: "Tenancies",
          description:
            "Dates, rent, deposit and notice period on one record, tied to the property and the tenant. Renewals and endings without a paper trail.",
        },
        {
          id: "payments",
          title: "Rent and payments",
          description:
            "Rent invoices raise themselves on the date in the tenancy. Paid and overdue statuses, email reminders to the tenant.",
        },
        {
          id: "costs",
          title: "Running costs",
          description:
            "Mortgage, service charge, repairs and insurance in one register, split by property.",
        },
        {
          id: "reports",
          title: "Financial reports",
          description:
            "Income, costs and profit by property. Yearly cash-basis summary and CSV export for your accountant.",
        },
      ],
    },

    pricing: {
      heading: "Simple pricing, no traps",
      badge: "NO LIMITS",
      free: {
        name: "Free",
        price: "£0",
        period: "",
        note: "up to 20 tenants",
        items: [
          "Tenancies and records",
          "Rent invoices and reminders",
          "Costs and yearly summary",
        ],
        cta: "Start for free",
      },
      pro: {
        name: "Pro",
        price: "£29",
        period: "/month",
        note: "unlimited properties and tenants",
        items: ["Everything in Free", "Reports and accountant export", "Multiple team members"],
        cta: "Go Pro",
      },
    },

    closing: {
      titleFirstLine: "Move your lettings",
      titleSecondLine: "off the spreadsheet",
      lead: "First 20 tenants free, forever.",
      cta: "Create a free account →",
    },

    footer: {
      rights: "© 2026 Rentix. All rights reserved.",
    },
  },

  auth: {
    login: {
      metaTitle: "Log in",
      metaDescription: "Log in to your Rentix dashboard.",
      heading: "Log in",
      noAccount: "No account yet?",
      registerLink: "Create one for free",
      google: "Continue with Google",
      divider: "or",
      email: "Email address",
      password: "Password",
      submit: "Log in",
      submitting: "Logging in…",
    },

    register: {
      metaTitle: "Create an account",
      metaDescription: "Create a free Rentix account. First 20 tenants free.",
      heading: "Create a free account",
      hasAccount: "Already have an account?",
      loginLink: "Log in",
      google: "Sign up with Google",
      name: "Full name",
      organizationName: "Business or account name",
      organizationHint: "Shown on your documents and on your public listings page.",
      email: "Email address",
      password: "Password",
      passwordHint: "At least 10 characters, including a capital letter and a digit.",
      submit: "Create a free account",
      submitting: "Creating your account…",
      terms:
        "By creating an account you accept the Rentix terms and privacy policy. No credit card. First 20 tenants free, forever.",
      failed: "We couldn't create the account. Please try again in a moment.",
      emailTaken: "An account with this email address already exists.",
      emailTakenField: "This address is already taken",
    },

    errors: {
      rateLimited: "Too many login attempts. Wait 15 minutes and try again.",
      invalidCredentials: "Wrong email address or password.",
      oauthAccountNotLinked:
        "This address already belongs to an account with a password. Log in with the password, then connect Google afterwards.",
      oauthFailed: "Signing in with Google didn't go through. Try again or use your password.",
      accessDenied:
        "You didn't give Google permission to share your details, so the sign-in stopped there.",
      unknown: "We couldn't sign you in. Check the details and try again.",
    },

    validation: {
      passwordTooShort: "Password must be at least 10 characters",
      passwordTooLong: "Password can be at most 128 characters",
      passwordNeedsLower: "Password must contain a lowercase letter",
      passwordNeedsUpper: "Password must contain a capital letter",
      passwordNeedsDigit: "Password must contain a digit",
      emailRequired: "Enter your email address",
      emailTooLong: "That email address is too long",
      emailInvalid: "That email address isn't valid",
      passwordRequired: "Enter your password",
      nameRequired: "Enter your full name",
      nameTooLong: "That name is too long",
      organizationRequired: "Enter your business name or your own name",
      organizationTooLong: "That name is too long",
    },
  },

  panel: {
    nav: {
      dashboard: "Dashboard",
      properties: "Properties",
      propertiesShort: "Property",
      tenants: "Tenants",
      owners: "Landlords",
      ownersShort: "Landl.",
      leases: "Tenancies",
      finance: "Finance",
      reports: "Reports",
      settings: "Settings",
      settingsShort: "Account",
    },

    shell: {
      navAria: "Dashboard navigation",
      mobileNavAria: "Mobile navigation",
      menu: "Menu",
      more: "More",
      closeMenu: "Close menu",
      soon: "soon",
      soonTitle: "Module in the works",
      notifications: "Notifications",
      signOut: "Sign out",
      fallbackAccountName: "Account",
      planFree: "Free plan",
      planPro: "Pro plan",
    },

    validation: {
      maxChars: "At most {max} characters",
      required: "{label} is required",
      /*
        Brytyjski kod pocztowy jest alfanumeryczny i ma zmienną długość —
        polska maska „00-000" nie ma tu żadnego zastosowania.
      */
      postalCode: "Enter a postcode, for example SW1A 1AA",
      phone: "That phone number doesn't look right",
      /*
        Odpowiednikiem NIP-u jest numer VAT, ale najem mieszkaniowy jest z VAT
        zwolniony, więc większość wynajmujących go nie ma — pole zostaje
        opcjonalne, a komunikat mówi tylko o formacie.
      */
      taxId: "A VAT number is 9 digits, optionally with a GB prefix",
      bankAccount: "Enter a 6-digit sort code and an 8-digit account number",
      money: "{label} must be an amount, for example 2,400.50",
      moneyNegative: "{label} cannot be negative",
      moneyTooHigh: "{label} looks too high",
      notNumber: "{label} must be a number",
      notInteger: "{label} must be a whole number",
      tooHigh: "{label} cannot be more than {max}",
      outOfRange: "{label} must be between {min} and {max}",
      missingId: "Missing identifier",
      dateFormat: "{label}: enter the date as YYYY-MM-DD",
      dateInvalid: "{label}: that date does not exist",
    },

    owners: {
      fields: {
        name: "Landlord name",
        contractStart: "Management start date",
        contractEnd: "Management end date",
      },
      contractPeriodOrder: "The end date cannot be earlier than the start date",
      period: {
        range: "{start} – {end}",
        openEnded: "from {start}, no end date",
        until: "until {end}",
      },
    },

    expenses: {
      fields: {
        amount: "Amount",
        paidAt: "Date paid",
        description: "Description",
        interval: "Interval",
      },
      amountPositive: "The amount must be greater than zero",
      customIntervalRequired: "Say how many days apart this cost repeats",
      everyDays: "every {days} days",
      category: {
        MORTGAGE: "Mortgage payment",
        RENT: "Rent paid out",
        /*
          Brytyjskim odpowiednikiem czynszu do wspólnoty jest service charge
          przy leasehold — ta sama pozycja w rachunku, inna nazwa i inna
          podstawa prawna.
        */
        COMMUNITY_FEE: "Service charge and ground rent",
        UTILITIES: "Utilities",
        REPAIR: "Repairs and maintenance",
        FURNISHING: "Furnishings",
        INSURANCE: "Insurance",
        /* Council tax płaci zwykle najemca, ale przy pustostanie wraca do właściciela. */
        PROPERTY_TAX: "Council tax",
        INCOME_TAX: "Income tax on rent",
        MANAGEMENT: "Letting and management fees",
        ACCOUNTING: "Accountancy",
        LEGAL: "Legal fees",
        OTHER: "Other",
      },
      recurrence: {
        WEEKLY: "Every week",
        MONTHLY: "Every month",
        YEARLY: "Every year",
        CUSTOM: "Custom",
      },
    },

    settings: {
      fields: {
        organizationName: "Name",
        userName: "Full name",
      },
      logoTooLarge: "That file is too large",
      logoWrongType: "Upload a PNG or JPEG image",
      logoMaxSize: "The image can be at most {kb} kB",
      phoneInvalid: "That phone number doesn't look right",
      currentPasswordRequired: "Enter your current password",
      newPasswordSame: "The new password must differ from the current one",
      passwordToConfirm: "Enter your password to confirm",
      deletePhrase: "DELETE MY ACCOUNT",
      deleteConfirmation: "Type exactly: {phrase}",
      wholeDays: "Enter whole days",
      reminderTooEarly: "More than 30 days ahead is too early",
      reminderTooLate: "A reminder must come at least a day before the due date",
      overdueTooOften: "Daily chasers end up in spam, set at least 2 days",
      overdueTooRare: "Less often than every 60 days stops being a chaser",
      unknownVariables: "Unknown variables: {names}. Check the list below the field.",
    },

    api: {
      invalidJson: "The request body must be valid JSON.",
      notFound: {
        owner: "Landlord not found.",
        archivedOwner: "Archived landlord not found.",
        property: "Property not found.",
        archivedProperty: "Archived property not found.",
        room: "Room not found.",
        tenant: "Tenant not found.",
        archivedTenant: "Archived tenant not found.",
        lease: "Tenancy not found.",
        archivedLease: "Archived tenancy not found.",
        invoice: "Document not found.",
        payment: "Payment not found.",
        expense: "Cost not found.",
      },
    },

    invoices: {
      fields: {
        lineDescription: "Line description",
        unitPrice: "Unit price",
        issueDate: "Issue date",
        /*
          Polska faktura rozdziela datę wystawienia i datę sprzedaży, bo wymaga
          tego FA(2). Brytyjski rachunek za czynsz mówi po prostu, za co jest —
          stąd „okres najmu" zamiast daty sprzedaży.
        */
        saleDate: "Supply date",
        dueDate: "Due date",
        periodStart: "Period from",
        periodEnd: "Period to",
        paymentAmount: "Payment amount",
        paymentDate: "Payment date",
      },
      quantityNotNumber: "The quantity must be a number",
      quantityPositive: "The quantity must be greater than zero",
      quantityTooHigh: "That quantity looks too high",
      unitMaxChars: "At most 12 characters",
      defaultUnit: "item",
      linesRequired: "A document needs at least one line",
      linesTooMany: "At most 50 lines on one document",
      dueBeforeIssue: "The due date cannot be earlier than the issue date",
      periodOrder: "The period end cannot be earlier than its start",
      paymentPositive: "The payment must be greater than zero",
      kind: {
        BILL: "Rent invoice",
        /*
          Faktura VAT zostaje w slowniku, bo enum w bazie jej nie traci, ale
          wersja brytyjska nie wystawia jej z panelu — najem mieszkaniowy jest
          w Wielkiej Brytanii z VAT zwolniony, a dokument w kształcie FA(2)
          nie ma tam zastosowania.
        */
        VAT_INVOICE: "VAT invoice",
        PROFORMA: "Pro forma",
        CHARGE: "Charge",
      },
      method: {
        TRANSFER: "Bank transfer",
        CASH: "Cash",
        CARD: "Card",
        DIRECT_DEBIT: "Direct Debit",
        OTHER: "Other",
      },
    },

    tenants: {
      fields: {
        firstName: "First name",
        lastName: "Surname",
        dateOfBirth: "Date of birth",
        /*
          Polski „adres zameldowania" nie ma brytyjskiego odpowiednika — nie ma
          tam meldunku. Pole zostaje jako adres poprzedni, ten, który podaje się
          referencyjnie przy wynajmie.
        */
        registeredUntil: "Lived at previous address until",
        employmentUntil: "Employment or studies end",
        insuranceExpiresAt: "Policy expiry",
      },
      identity: {
        /*
          Dowodu osobistego w Wielkiej Brytanii nie ma — tożsamość potwierdza
          prawo jazdy albo paszport. Format prawa jazdy jest zmienny, więc
          sprawdzamy tylko, że to numer, a nie zdanie wpisane w złe pole.
        */
        idCard: "Enter a driving licence number, 5 to 20 letters and digits",
        /*
          Odpowiednikiem PESEL-u jest numer National Insurance: dwie litery,
          sześć cyfr i litera od A do D.
        */
        nationalId: "A National Insurance number is 2 letters, 6 digits and a final letter, e.g. QQ123456C",
        passport: "That passport number doesn't look right",
      },
      status: {
        PROSPECT: "Enquiry",
        ACTIVE: "Active",
        FORMER: "Former tenant",
      },
      legalForm: {
        INDIVIDUAL: "Individual",
        COMPANY: "Company",
      },
      documentKindHint: {
        BILL: "A rent invoice. The default, and the right choice for most residential lettings.",
        VAT_INVOICE: "Always a VAT invoice. Only for a business tenant on a commercial let that requires one.",
        CHARGE: "A charge only, telling the tenant what is due. It is not an accounting document and has its own numbering.",
      },
      sort: {
        name: "Surname",
        address: "Property address",
        debt: "Arrears",
        leaseStatus: "Tenancy status",
      },
    },

    leases: {
      fields: {
        startDate: "Start date",
        endDate: "End date",
        newEndDate: "New end date",
        rent: "Rent",
        /*
          Kaucja w Anglii i Walii podlega ochronie w rządowym schemacie
          depozytowym i jest ograniczona ustawą Tenant Fees Act. Rentix jej nie
          rejestruje — tu jest wyłącznie kwotą w ewidencji.
        */
        deposit: "Deposit",
        utilitiesAdvance: "Utilities allowance",
        billingStartsAt: "Do not invoice before",
      },
      propertyRequired: "Choose a property",
      tenantRequired: "Add at least one tenant",
      tenantsTooMany: "At most six tenants on one tenancy",
      tenantDuplicate: "The same tenant is listed twice",
      endBeforeStart: "The end date cannot be earlier than the start date",
      advanceRequired: "Enter the amount of the utilities allowance",
      billingDayInteger: "The billing day must be a whole number",
      billingDayRange: "The billing day must be between 1 and 28",
      paymentTermInteger: "The payment term must be a whole number",
      paymentTermNegative: "The payment term cannot be negative",
      paymentTermTooLong: "The payment term cannot be more than 90 days",
      status: {
        DRAFT: "Draft",
        RESERVED: "Reserved",
        ACTIVE: "Active",
        /*
          „Wypowiedziana" to po brytyjsku umowa, w której doręczono
          wypowiedzenie — stąd „Notice served", a nie „Terminated".
        */
        TERMINATED: "Notice served",
        EXPIRED: "Ended",
      },
      utilitiesMode: {
        INCLUDED: "Bills included",
        FLAT_RATE: "Fixed allowance",
        METERED: "By meter readings",
        MIXED: "Allowance plus reconciliation",
      },
      utilitiesHint: {
        INCLUDED: "The invoice covers rent only.",
        FLAT_RATE: "A fixed utilities allowance is added to the rent.",
        METERED: "Utility lines come from meter readings.",
        MIXED: "An allowance each month, reconciled against readings.",
      },
      utilitiesIncomplete: {
        METERED:
          "Meter readings cannot be entered in Rentix yet, so the invoice will cover rent only. Add utility lines outside the system for now.",
        MIXED:
          "The utilities allowance will be invoiced as normal, but Rentix cannot yet reconcile it against meter readings.",
      },
    },

    properties: {
      fields: {
        name: "Name",
        street: "Street",
        buildingNumber: "House or building number",
        city: "Town or city",
        area: "Floor area",
        floor: "Floor",
        askingRent: "Asking rent for the whole property",
        internetSpeed: "Broadband speed",
        /*
          Polski wskaźnik EP ze świadectwa charakterystyki energetycznej
          odpowiada brytyjskiemu EPC — tam podaje się literę od A do G, ale
          liczba (SAP rating) też jest na dokumencie, więc pole zostaje liczbowe.
        */
        energyIndex: "EPC rating",
        certificateValidUntil: "EPC valid until",
        /* Gas Safety Record trzeba odnawiać co rok — to ten sam przegląd. */
        boilerInspection: "Gas safety check",
        technicalInspection: "Electrical safety check",
        transitDistance: "Distance to public transport",
        universityDistance: "Distance to university",
        roomName: "Room name",
        roomRent: "Room rent",
      },
      checkoutTimeFormat: "Time as HH:MM, for example 11:00",
      checkoutTimeInvalid: "That time does not exist",
      coordinatesFormat: "Coordinates as 51.5072, -0.1276",
      coordinatesRange: "Latitude is within ±90, longitude within ±180",
      roomCountInteger: "The number of rooms must be a whole number",
      roomCountTooMany: "At most {max} rooms at once",
      defaultRoomName: "Room {number}",
      type: {
        APARTMENT: "Flat",
        HOUSE: "House",
        ROOM: "Room",
        COMMERCIAL: "Commercial unit",
        PARKING: "Parking space",
        STORAGE: "Storage unit",
        BUILDING: "Building",
      },
      rentalStatus: {
        AVAILABLE: "Available",
        OCCUPIED: "Let",
        UNAVAILABLE: "Under refurbishment",
      },
      heating: {
        /* Ciepła sieciowego w brytyjskim najmie prawie nie ma; odpowiednikiem jest district heating. */
        DISTRICT: "District heating",
        GAS: "Gas central heating",
        ELECTRIC: "Electric",
        HEAT_PUMP: "Heat pump",
        SOLID_FUEL: "Solid fuel",
        OTHER: "Other",
      },
    },
  },
};
