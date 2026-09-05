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

    /* Progi te same co w wersji polskiej, ceny lokalne — brytyjski rynek unosi
       więcej: Landlord Studio £12 plus funt za lokal, Arthur od £70. */
    pricing: {
      heading: "Simple pricing, no traps",
      lead: "Every plan has every feature. Only the number of tenancies changes.",
      badge: "MOST POPULAR",
      note: "Prices exclude VAT and are billed monthly. Pay yearly and you pay for ten months.",
      plans: [
        {
          name: "Free",
          price: "£0",
          period: "",
          note: "2 tenancies",
          featured: false,
          items: ["Every feature in the app", "No time limit, no card"],
          cta: "Start for free",
        },
        {
          name: "Start",
          price: "£9",
          period: "/month",
          note: "up to 10 tenancies",
          featured: false,
          items: ["Every feature in the app", "Email support"],
          cta: "Choose Start",
        },
        {
          name: "Pro",
          price: "£24",
          period: "/month",
          note: "up to 30 tenancies",
          featured: true,
          items: ["Every feature in the app", "Support within 24 hours"],
          cta: "Choose Pro",
        },
        {
          name: "Portfolio",
          price: "£59",
          period: "/month",
          note: "no tenancy limit",
          featured: false,
          items: ["Every feature in the app", "Limit agreed with you"],
          cta: "Choose Portfolio",
        },
      ],
    },

    closing: {
      titleFirstLine: "Move your lettings",
      titleSecondLine: "off the spreadsheet",
      lead: "Two tenancies free, no time limit.",
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
      metaDescription: "Create a free Rentix account. Two tenancies free, no time limit.",
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
        "By creating an account you accept the Rentix terms and privacy policy. No credit card. Two tenancies free, no time limit.",
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

    dashboard: {
      title: "Dashboard",
      greeting: "Hello, {name}",
      greetingFallback: "there",
      addProperty: "Add property",
      sellerIncomplete:
        "Add your details. Without an address, invoices and records go out with your name only.",
      goToSettings: "Go to settings",
      emptyTitle: "Start with your first property",
      emptyLead:
        "Add a flat or a house, then the units you let. Tenants, tenancies and invoices hang off it from there.",
      statProperties: "Properties",
      statRooms: "Rooms",
      statOccupancy: "Occupancy",
      statOccupancyHint: "{occupied} of {total} let",
      statArrears: "Arrears",
      overdueInvoices: ["{count} invoice overdue", "{count} invoices overdue"],
      allSettled: "All settled",
      propertiesCardLead: "Manage your properties and the units you let.",
      goToList: "Go to the list",
    },

    tabs: {
      financeAria: "Finance sections",
      financeDocuments: "Documents",
      financeExpenses: "Costs",
      settingsAria: "Settings sections",
      settingsOrganization: "Organisation",
      settingsNotifications: "Notifications",
      settingsMessages: "Messages",
      settingsAccount: "Account",
    },

    propertiesPage: {
      title: "Properties",
      lead: "The properties and units in your portfolio.",
      archived: "Archived",
      add: "Add property",
      noMatchTitle: "Nothing matches these filters",
      noMatchLead: "Try another search, or clear the filters to see every property.",
      emptyTitle: "No properties yet",
      emptyLead:
        "Add your first property, then the units you let. Tenancies and invoices hang off it from there.",
      newTitle: "New property",
      newLead: "Add the property, then its units in the next step.",
      editTitle: "Edit property",
      archiveTitle: "Archived properties",
      badge: {
        underRefurbishment: "Under refurbishment",
        let: "Let",
        vacant: "Available",
        allLet: "Fully let",
        someVacant: "{available}/{total} available",
      },
      noun: ["property", "properties"],
      detail: {
        archived: "Archived",
        publiclyListed: "Listed publicly",
        sublet: "Sublet",
        ownerPrefix: "Landlord: ",
        floor: "floor {floor}",
        wholeRent: "whole property {amount}",
        wholeLetTitle: "Letting the whole property to one person?",
        wholeLetLead: "One tenancy for the property instead of separate room tenancies.",
        wholeLetButton: "Let the whole property",
        access: "Access",
        intercom: "Entry code",
        checkoutTime: "Check-out time",
        storage: "Storage unit",
        bikeStorage: "Bike storage",
        waste: "Bin store",
        /* Polskiej wspólnoty mieszkaniowej odpowiada tam managing agent przy leasehold. */
        buildingManager: "Managing agent",
        name: "Name",
        address: "Address",
        phone: "Phone",
        email: "Email",
        utilities: "Heating and broadband",
        heating: "Heating",
        internetSpeed: "Broadband speed",
        internetProvider: "Broadband provider",
        internetProviderPhone: "Provider phone",
        wifiSsid: "Wi-Fi network",
        wifiPassword: "Wi-Fi password",
        internetContractEnd: "Broadband contract ends",
        inspections: "Certificates and checks",
        /* Księgi wieczystej nie ma — odpowiednikiem jest tytuł w Land Registry. */
        landRegistry: "Land Registry title",
        energyIndex: "EPC rating",
        /* Brytyjskie EPC podaje ocenę SAP bez jednostki — kWh/(m²·rok) to zapis polskiego świadectwa. */
        energyUnit: "{value}",
        certificateValidUntil: "EPC valid until",
        boilerModel: "Boiler model",
        boilerInspection: "Gas safety check",
        technicalInspection: "Electrical safety check",
        area: "Area and transport",
        transitLines: "Transport links",
        toTransit: "To public transport",
        toUniversity: "To university",
        gps: "GPS coordinates",
        nearbyPlaces: "Nearby",
        notes: "Internal notes",
        overdue: " · overdue",
      },
      form: {
        name: "Name",
        nameHint: "A working name you will recognise in the list.",
        type: "Type",
        status: "Status",
        statusHint: "Under refurbishment takes it out of the available list.",
        roomCount: "Number of rooms",
        roomCountHint: "The rooms are created straight away. You set the rents in the next step.",
        street: "Street",
        buildingNumber: "House or building number",
        apartmentNumber: "Flat number",
        apartmentNumberHint: "Leave blank for a house.",
        postalCode: "Postcode",
        city: "Town or city",
        district: "Area",
        area: "Floor area (m²)",
        floor: "Floor",
        intercom: "Entry code",
        checkoutTime: "Check-out time",
        checkoutTimeHint: "By when the tenant hands the keys back on the last day.",
        storage: "Storage unit",
        storageHint: "Its number and where to find it.",
        bikeStorage: "Bike storage",
        waste: "Bin store",
        managerName: "Name",
        managerAddress: "Address",
        managerPhone: "Phone",
        managerEmail: "Email",
        heating: "Heating type",
        notSet: "Not set",
        internetSpeed: "Broadband speed (Mbit/s)",
        internetProvider: "Broadband provider",
        internetProviderPhone: "Provider phone",
        wifiSsid: "Wi-Fi network name",
        wifiPassword: "Wi-Fi password",
        wifiPasswordHint: "Only you see this. You pass it to the tenant at the key handover.",
        internetContractEnd: "Broadband contract ends",
        internetContractEndHint: "So it does not roll over on its own.",
        /*
          Księgi wieczystej w Wielkiej Brytanii nie ma, a najem okazjonalny to
          instytucja polskiego prawa — odpowiednikiem jest numer tytułu
          w Land Registry, którego szuka się przy sprzedaży i przy sporze.
        */
        landRegistry: "Land Registry title number",
        landRegistryHint: "The title number from your Land Registry entry.",
        energyIndex: "EPC rating",
        energyIndexHint: "From the Energy Performance Certificate.",
        certificateValidUntil: "EPC valid until",
        boilerModel: "Boiler model",
        boilerInspection: "Next gas safety check",
        technicalInspection: "Next electrical safety check",
        gps: "GPS coordinates",
        gpsHint: "Paste from a map, for example 51.5072, -0.1276.",
        transitLines: "Transport links",
        transitLinesHint: "Bus 11 and 50, Northern line, say.",
        transitDistance: "Distance to public transport (m)",
        universityDistance: "Distance to university (m)",
        nearbyPlaces: "What is nearby",
        nearbyPlacesHint: "Shop, GP surgery, school, park.",
        description: "Description",
        descriptionHint: "Shown on your public listings page, if you turn it on.",
        notes: "Internal notes",
        notesHint: "Only you see these. The tenant never will.",
        publiclyListed: "Show on the public listings page",
        publiclyListedHint: "Available rooms appear at your organisation's address.",
        sectionBasics: "Basics",
        sectionOwnerHint:
          "For sublets and for managing someone else's property. If it is your own, leave „my own property”.",
        sectionAccess: "Access",
        sectionAccessHint:
          "What you hand over with the keys — and what you go digging for in year-old emails afterwards.",
        sectionManager: "Managing agent",
        sectionManagerHint:
          "The freeholder's agent or the block manager. The number you ring about a leak or a communal fault. Not the landlord.",
        sectionUtilities: "Heating and broadband",
        sectionPapers: "Certificates and checks",
        sectionPapersHint:
          "The dates that become a problem once they pass. The property card highlights the ones that have.",
        sectionArea: "Area and transport",
        sectionAreaHint: "The answers to the questions asked at every viewing.",
        sectionNotes: "Description and notes",
        saving: "Saving…",
        continueLabel: "Continue",
      },
      roomsPanel: {
        emptyTitle: "This property has no rooms",
        emptyLead:
          "Add rooms if you want to let them separately. Without them the property is let as a whole.",
        add: "Add room",
        newRoom: "New room",
        close: "Close",
        designation: "Name",
        status: "Status",
        rent: "Room rent",
        wholeLet: "The whole property is let to: ",
        notLetSeparately: ". Rooms are not let separately.",
        pricingName: "Room name",
        pricingRent: "Monthly rent",
        pricingLead:
          "You can leave the rents blank and fill them in later. Tenants are assigned to rooms on the property page.",
        saving: "Saving…",
        saveAndFinish: "Save and finish",
        skipPricing: "Skip the rents",
        nameRequired: "Give the room a name",
        rentInvalid: "The rent must be an amount, for example 900.00",
      },
      filters: {
        searchPlaceholder: "Search by name, street or town…",
        searchLabel: "Search properties",
        typeLabel: "Property type",
        allTypes: "All types",
        availabilityLabel: "Availability",
        all: "All",
        vacant: "With vacancies",
        underRefurbishment: "Under refurbishment",
        occupied: "Let",
        counted: ["{count} property", "{count} properties"],
        clear: "Clear filters",
        filtering: "Filtering…",
      },
      rooms: ["room", "rooms"],
    },

    archive: {
      lead: "Tick the items to restore them, or delete them for good.",
      empty:
        "The archive is empty. Anything you archive lands here. Nothing disappears for good until you say so.",
      restored: "Restored {count} {noun}.",
      deleted: "Permanently deleted {count} {noun}.",
      partialFailure: "Some items were left untouched:",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      nothingSelected: "Nothing selected",
      selectedCount: "{count} {noun}",
      restore: "Restore",
      deleteForever: "Delete for good",
      confirmDelete: "Sure? Delete for good",
      deleteWarning:
        "This cannot be undone. There is no bin and no copy. Items linked to tenancies or invoices are skipped, because deleting them would break the payment history.",
    },

    ownersPage: {
      /*
        Polski „właściciel" to w brytyjskim najmie po prostu landlord — osoba,
        której lokal obsługujesz w podnajmie albo w zarządzaniu.
      */
      title: "Landlords",
      lead: "Landlords whose properties you sublet or manage.",
      add: "Add landlord",
      addFirst: "Add your first landlord",
      emptyTitle: "No landlords yet",
      emptyLead:
        "Add a landlord when you sublet someone else's property or manage it on their behalf. If you only let your own, this list stays empty.",
      newTitle: "New landlord",
      editTitle: "Edit landlord",
      archiveTitle: "Archived landlords",
      archiveNote:
        "A landlord with properties attached cannot be deleted for good. Detach them first.",
      archiveHint: "They disappear from the list, but their properties and history stay untouched.",
      archived: "Archived",
      archivedBadge: "Archived",
      companyBadge: "business",
      propertyCount: ["{count} property", "{count} properties"],
      occupiedCount: "{count} let",
      archivedProperty: "Archived",
      bankAccountTerm: "Bank details",
      contractTerm: "Managed",
      notes: "Notes",
      properties: "Properties",
      archiveLabel: "this landlord",
      contactSection: "Contact and payment details",
      noContactData: "No contact details or bank details have been added yet.",
      noProperties:
        "No property is assigned to this landlord yet. Pick them in the property form, under „Landlord”.",
      noun: ["landlord", "landlords"],
      form: {
        title: "Landlord details",
        lead: "The owner of a property you sublet. They are not a party to the tenancy — that is you.",
        save: "Save changes",
        owner: "Landlord",
        ownerHint: "Their name, or the business name.",
        taxId: "VAT number",
        taxIdHint: "Businesses only.",
        email: "Email",
        phone: "Phone",
        street: "Street and number",
        postalCode: "Postcode",
        city: "Town or city",
        bankAccount: "Bank details",
        bankAccountHint: "Where you pass the rent on, after your commission.",
        contractFrom: "Managed from",
        contractFromHint: "When your management agreement for this property starts.",
        contractTo: "Managed until",
        contractToHint: "Blank means no end date.",
        notes: "Notes",
        notesHint: "Only you see these — commission terms, for example.",
      },
      picker: {
        label: "Property landlord",
        hint: "Leave blank if the property is yours. Fill it in for sublets and management.",
        own: "My own property",
        addNew: "New landlord",
        addNewHint: "Saved straight away and selected for this property.",
      },
    },

    common: {
      cancel: "Cancel",
      save: "Save",
      saveChanges: "Save changes",
      back: "Back",
      delete: "Delete",
      edit: "Edit",
      archive: "Archive",
      restore: "Restore",
      loading: "Loading…",
      none: "—",
    },

    tenantsPage: {
      title: "Tenants",
      count: ["{count} tenant", "{count} tenants"],
      withDebt: " · {count} with outstanding payments",
      archived: "Archived",
      archivedBadge: "Archived",
      add: "Add tenant",
      emptyTitle: "No tenants yet",
      emptyLead: "Add a tenant so you can attach them to a tenancy and invoice them.",
      noLease: "No tenancy",
      overdueCount: "{count} overdue",
      toPay: "outstanding",
      settled: "Settled",
      form: {
        firstName: "First name",
        lastName: "Surname",
        email: "Email",
        emailHint: "Without an address we cannot send payment reminders.",
        phone: "Phone",
        status: "Status",
        legalForm: "Legal form",
        legalFormHint: "For a company, add the VAT number under billing details.",
        /*
          Dowodu osobistego w Wielkiej Brytanii nie ma, PESEL-owi odpowiada
          numer National Insurance, a karcie pobytu — dokument imigracyjny
          (BRP albo kod udostępniania z Home Office).
        */
        idCard: "Driving licence",
        nationalId: "National Insurance number",
        passport: "Passport number",
        residenceCard: "Immigration document",
        dateOfBirth: "Date of birth",
        dateOfBirthHint: "Copy it from the same document as the number.",
        street: "Street and number",
        postalCode: "Postcode",
        city: "Town or city",
        registeredUntil: "Lived there until",
        registeredUntilHint: "Blank means no end date.",
        billingEmail: "Billing email",
        billingPhone: "Billing phone",
        depositAccount: "Account for the deposit refund",
        depositAccountHint: "Taking it now saves hunting for it on the day they move out.",
        employer: "Employer or university",
        until: "Until",
        untilHint: "Blank means no end date.",
        insurer: "Insurer",
        policyNumber: "Policy number",
        validUntil: "Valid until",
        taxId: "VAT number",
        taxIdHint: "Businesses only.",
        documentKind: "What we issue",
        notes: "Internal notes",
        notesHint: "Only you see these.",
        sectionBasics: "Tenant details",
        sectionIdentity: "Identity documents",
        sectionIdentityHint: "Every field is optional. Record what the tenant showed you.",
        sectionEmergency: "Emergency contact",
        sectionEmergencyHint: "Who you ring when the tenant cannot be reached.",
        /*
          Meldunku w Wielkiej Brytanii nie ma. Adres poprzedni pełni tam
          podobną rolę praktyczną: podaje się go przy referencjach i sprawdzeniu
          zdolności najemcy.
        */
        sectionRegistered: "Previous address",
        sectionRegisteredHint:
          "Where the tenant lived before, and often where they go back to. Referencing agencies ask for it, and it need not match the billing address.",
        sectionBillingContactHint:
          "Only fill this in when someone other than the tenant pays the rent — a parent, say, or their company's accounts team.",
        sectionWork: "Work and studies",
        sectionWorkHint: "The shortest answer to how this tenant pays the rent.",
        sectionInsurance: "Tenant insurance",
        sectionInsuranceHint:
          "The liability policy you reach for after damage — a leak into the flat below, or a broken appliance.",
        sectionBilling: "Billing details",
        sectionBillingHint: "These go on the invoice as the recipient. You can add them later.",
        copyRegistered: "Copy the previous address",
        saving: "Saving…",
      },
      detail: {
        company: "Company",
        archiveLabel: "this tenant",
        archiveHint:
          "They disappear from the tenant list. Their tenancies and issued documents stay untouched — they appear on those as the recipient.",
        outstanding: "Outstanding",
        paidTotal: "Paid in total",
        leases: "Tenancies",
        assignToProperty: "Assign to a property",
        createLease: "Create tenancy",
        openEnded: "no end date",
        leaseNumber: " · no. {number}",
        perMonth: "{amount}/month",
        invoices: "Invoices",
        noInvoices: "No invoices issued.",
        messages: "Messages",
        noThreads: "No message threads with this tenant.",
        threadWithoutSubject: "Thread without a subject",
        identity: "Identity details",
        /*
          Dowodu osobistego w Wielkiej Brytanii nie ma — tożsamość potwierdza
          prawo jazdy, a odpowiednikiem PESEL-u jest numer National Insurance.
          Karta pobytu to biometryczne pozwolenie (BRP) albo kod udostępniania.
        */
        idCard: "Driving licence",
        nationalId: "National Insurance no.",
        passport: "Passport",
        residenceCard: "Immigration document",
        dateOfBirth: "Date of birth",
        emergency: "Emergency contact",
        person: "Person",
        phone: "Phone",
        email: "Email",
        /* Meldunku w Wielkiej Brytanii nie ma — to adres poprzedni, referencyjny. */
        registered: "Previous address",
        address: "Address",
        registeredUntil: "Lived there until",
        payments: "Payments",
        billingEmail: "Billing email",
        billingPhone: "Billing phone",
        depositAccount: "Account for the deposit refund",
        work: "Work and studies",
        employer: "Employer or university",
        until: "Until",
        insurance: "Tenant insurance",
        insurer: "Insurer",
        policyNumber: "Policy number",
        validUntil: "Valid until",
        notes: "Internal notes",
      },
      sortAria: "Sort tenants",
      newTitle: "New tenant",
      newLead: "A name is enough. The rest can wait until you sign the tenancy.",
      editTitle: "Edit tenant",
      archiveTitle: "Archived tenants",
      archiveNote:
        "A tenant with a tenancy history cannot be deleted for good — their details appear on documents you have already issued.",
      noun: ["tenant", "tenants"],
    },

    archiveAction: {
      restore: "Restore from archive",
      archiveWithLabel: "Archive {label}",
      archive: "Archive",
    },

    leasesPage: {
      title: "Tenancies",
      count: ["{count} tenancy", "{count} tenancies"],
      activeSuffix: " · {count} active",
      archived: "Archived",
      add: "New tenancy",
      addFirst: "Create your first tenancy",
      emptyTitle: "No tenancies yet",
      emptyLead: "A tenancy links a unit to a tenant and is what the rent is invoiced from.",
      roomLet: "Room let",
      arrears: ["{count} arrear", "{count} arrears"],
      openEnded: "no end date",
      numberPrefix: "no. {number}",
      perMonth: "per month",
      newTitle: "New tenancy",
      /*
        Polska wersja obiecuje tu gotowy PDF do podpisu. Brytyjska nie —
        umowa (AST) jest pisana pod inne prawo i Rentix jej nie wystawia.
      */
      newLead: "",
      newLeadNoDocument: "The letting terms in one place, ready to invoice from.",
      missingPrefix: "Before you create a tenancy, add {what}.",
      missingProperty: "a property",
      missingTenant: "a tenant",
      missingJoin: " and ",
      needProperty: "Add a property",
      needTenant: "Add a tenant",
      archiveTitle: "Archived tenancies",
      archiveNote:
        "A tenancy with issued documents cannot be deleted for good. Invoices and payments stay, because that is the payment history.",
      archiveItemNumber: ", no. {number}",
      archiveItemFrom: "{status} · from {date}",
      noun: ["tenancy", "tenancies"],
      detail: {
        numbered: "Tenancy {number}",
        untitled: "Tenancy",
        openEnded: "no end date",
        subject: "What is let",
        singleRoom: "A single room",
        tenant: "Tenant",
        tenants: "Tenants",
        primary: "lead",
        terms: "Financial terms",
        rent: "Monthly rent",
        /* Kwota słownie to wymóg polskiej umowy — pusty tekst usuwa ten wiersz. */
        inWords: "",
        deposit: "Deposit",
        utilities: "Utilities",
        utilitiesAdvance: "Utilities allowance",
        billingDay: "Invoice day",
        billingDayValue: "day {day} of the month",
        paymentTerm: "Payment term",
        paymentTermValue: "{days} days",
        extras: "Additional terms",
        invoices: "Invoices",
        archiveLabel: "this tenancy",
        archiveHint:
          "It disappears from the tenancy list. Invoices, payments and the whole payment history stay untouched.",
      },
      form: {
        property: "Property",
        propertyHint: "Picking a property fills in the rent from its asking price.",
        choosePropertyOption: "Choose a property",
        room: "Room",
        roomHint: "Leave blank if you let the whole property to one person or group.",
        wholeProperty: "Whole property",
        tenants: "Tenants",
        tenantsHint: "The first one is the lead tenant. Invoices go to them.",
        allTenantsAdded: "All tenants added",
        addTenant: "Add tenant",
        contractData: "Details for the record",
        missingAddress: "no address — add one on the tenant record",
        startDate: "Start date",
        endDate: "End date",
        endDateHint: "Blank means no end date.",
        status: "Status",
        statusHint: "Active occupies the unit and starts the invoicing.",
        number: "Tenancy reference",
        numberHint: "Optional.",
        rent: "Monthly rent",
        deposit: "Deposit",
        depositHint: "Changing it does not recalculate invoices already issued.",
        utilities: "Utilities",
        utilitiesAdvance: "Utilities allowance",
        billingDay: "Invoice day",
        billingDayHint: "1 to 28, so February needs no exception.",
        billingStart: "Do not invoice before",
        billingStartHint:
          "For tenancies moved over from another system. Enter the first day of the month you start invoicing in Rentix. Blank means from the start of the tenancy.",
        billingStartShortHint:
          "Months already settled in your previous system. Blank means from the start.",
        paymentTerm: "Payment term (days)",
        sendByEmail: "Email invoices to the tenant",
        sendByEmailHint:
          "Turn this off if this tenant gets documents outside the system. Sending one by hand from the invoice view still works.",
        extras: "Additional terms",
        sectionSubject: "What is let, and to whom",
        sectionPeriod: "Dates and status",
        sectionRent: "Rent and invoicing",
        saving: "Saving…",
        create: "Create tenancy",
      },
      expiry: {
        today: "The tenancy ends today",
        remaining: "{days} {noun} to the end of the tenancy",
        days: ["day", "days"],
      },
      terminate: {
        button: "End tenancy",
        title: "Ending the tenancy",
        lead: "The unit returns to the available pool and the tenants become former tenants.",
        endDate: "End date",
        note: "Reason / notes",
        noteHint: "Optional.",
      },
      extend: {
        button: "Extend tenancy",
        title: "Extending the tenancy",
        presets: { months3: "by 3 months", months6: "by 6 months", months12: "by a year" },
        current: "Currently until {date}. Only the end date changes — the rent and the other terms stay as they are.",
        presetUntil: "{label} · until {date}",
        customDate: "Or a date of your own",
      },
      activate: {
        reserved: "Reserved, waiting to start",
        draft: "Draft tenancy",
      },
      activateButton: "Activate tenancy",
      activateLead:
        "A tenancy marked {status} does not occupy the unit and is not invoiced. Once active, the unit is let and the tenants become current.",
      emailToggle: {
        label: "Email invoices to the tenant",
        off: "Off: documents will not go out in the nightly run. Sending one by hand from the invoice view still works.",
      },
      billingStart: {
        label: "Do not invoice before",
        hint: "Months already settled in your previous system. Blank means invoice from the start of the tenancy.",
      },
    },

    financePage: {
      title: "Finance",
      lead: "Rent documents and tenant payments.",
      expensesLead: "What the letting costs you. Without these the report shows income, not profit.",
      unpaid: "Outstanding",
      unpaidDocs: ["{count} document", "{count} documents"],
      arrears: "Arrears",
      overdueCount: "{count} overdue",
      paidThisMonth: "Received this month",
      paidHint: "total payments recorded",
      noMatchTitle: "No document matches these filters",
      noMatchLead: "Change the criteria, or clear the filters to see every document.",
      emptyTitle: "No documents yet",
      emptyLead:
        "Rent is invoiced automatically on the day set in the tenancy. You can also invoice a chosen month by hand.",
      expensesTitle: "Costs",
      expensesTotal: "Total costs in view",
      expensesNoMatchTitle: "No cost matches these filters",
      expensesNoMatchLead: "Change the criteria, or clear the filters.",
      expensesEmptyTitle: "No costs yet",
      expensesEmptyLead:
        "Add the service charge, mortgage, repairs and insurance. Only then does the report show profit rather than income.",
      expenseForm: {
        add: "Add cost",
        editTitle: "Edit cost",
        newTitle: "New cost",
        category: "Category",
        amount: "Amount",
        paidAt: "Date paid",
        description: "Description",
        descriptionHint: "What the money went on. This shows up in the report.",
        property: "Property",
        propertyHint: "Blank means a cost for the account as a whole.",
        generalCost: "General cost",
        vendor: "Supplier",
        documentRef: "Reference",
        recurring: "Recurring cost",
        recurringHint: "Rentix adds the next entry itself once it falls due.",
        recurrence: "How often you pay it",
        everyDays: "Every how many days",
        everyDaysHint: "90, say, for a quarterly service.",
        notes: "Note",
        save: "Save cost",
        close: "Close",
      },
      expenseFilters: {
        searchPlaceholder: "Search by description, supplier or reference…",
        searchLabel: "Search costs",
        year: "Year",
        allYears: "All years",
        category: "Category",
        allCategories: "All categories",
        property: "Property",
        allProperties: "All properties",
        clear: "Clear filters",
        filtering: "Filtering…",
        counted: ["{count} cost", "{count} costs"],
      },
      invoiceFilters: {
        searchPlaceholder: "Search by number, tenant or property…",
        searchLabel: "Search documents",
        statusLabel: "Payment status",
        kind: "Document type",
        all: "All",
        issuedFrom: "Issued from",
        issuedTo: "Issued to",
        dueFrom: "Due from",
        dueTo: "Due to",
        amountFrom: "Amount from ({currency})",
        amountTo: "Amount to ({currency})",
        clear: "Clear filters",
        filtering: "Filtering…",
      },
      payment: {
        add: "Record payment",
        title: "New payment",
        amount: "Amount",
        paidAt: "Date received",
        method: "Method",
        reference: "Payment reference",
        referenceHint: "Optional. Makes it easier to match against your bank statement.",
        remove: "Delete payment",
      },
      send: {
        noLease:
          "This document is not linked to a tenancy, so there is no one to send it to — the recipient comes from the tenancy. To email it to a tenant, issue it against their tenancy.",
        noEmail:
          "This tenant has no email address, so the document has nowhere to go — not now and not in the nightly run. Add an address to their record.",
        confirm:
          "The message goes to {email}, with the PDF attached. A sent email cannot be recalled.",
        button: "Send to tenant",
      },
      generate: {
        title: "Invoice the rent",
        button: "Invoice rent",
        leadTenant: "Issues documents for the chosen month across this tenant's active tenancies.",
        leadAll: "Issues documents for every active tenancy for the chosen month.",
        alsoSkipped: "Tenancies already invoiced for this period are skipped.",
        issued: "Issued {count} {noun}: {numbers}.",
        skipped: "Skipped {count} {noun}: {reasons}.",
        month: "Month",
        year: "Year",
        run: "Invoice",
        close: "Close",
        skipReason: {
          ALREADY_INVOICED: "already had a document for this period",
          OUTSIDE_LEASE_PERIOD: "were not running in this month",
          NO_TENANT: "have no tenant assigned",
          NOTHING_TO_BILL: "have nothing to invoice",
          BILLING_DAY_AHEAD: "have a billing day still ahead",
          BEFORE_BILLING_START: "only start being invoiced in Rentix from a later month",
        },
        nothingIssued: "No new document was issued.",
      },
      detail: {
        issuedOn: "Issued {issued} · payment due {due}",
        downloadPdf: "Download PDF",
        sellerIncomplete: "Your details are incomplete. The document will go out without an address.",
        completeInSettings: "Complete them in settings",
        buyer: "Bill to",
        snapshotNote: "Details copied at the moment of issue. The document shows them as they were that day.",
        subject: "What this covers",
        oneOff: "A one-off document, not linked to a tenancy.",
        period: "Period: {from}{to}",
        viewLease: "View tenancy",
        lineHeader: "Line",
        quantity: "Qty",
        vat: "VAT",
        net: "Net",
        gross: "Gross",
        totalNet: "Subtotal",
        totalVat: "VAT",
        totalDue: "Total due",
        paid: "Paid",
        remaining: "Outstanding",
        inWords: "",
        payments: "Payments",
        noPayments: "No payment recorded yet.",
        reminderSent: "Reminder sent {date}",
        reminderFailed: "Reminder could not be sent {date}",
        notes: "Notes",
      },
      manualInvoice: {
        open: "Issue by hand",
        lead: "For a deposit, a utilities reconciliation, a recharge or a correction — anything the automatic rent invoicing does not cover.",
        kind: "Document type",
        lease: "Tenancy",
        leaseHint:
          "Blank means a one-off document outside any tenancy. Emailing works either way; it goes to the tenant you issue it for.",
        noLease: "No tenancy",
        issueDate: "Issue date",
        saleDate: "Supply date",
        saleDateHint: "The day the service was provided.",
        dueDate: "Payment due",
        periodFrom: "Period from",
        periodFromHint: "Optional, when the document covers a period.",
        periodTo: "Period to",
        description: "Description",
        quantity: "Qty",
        unit: "Unit",
        unitPrice: "Unit price",
        vat: "VAT",
        addLine: "Add line",
        total: "Total due",
        notes: "Notes on the document",
        sendHint:
          "The document goes out as soon as it is issued, with the PDF attached. A sent message cannot be recalled.",
        depositLine: "Tenancy deposit",
        issueAndSend: "Issue and send",
        issue: "Issue document",
      },
      editExpense: "Edit cost",
      deleteExpense: "Delete cost",
      dueOn: "due {date}",
      remainingAmount: "{amount} left",
      markPaid: "Mark as paid: {amount}",
      downloadSelected: "Download selected",
      documentNoun: ["document", "documents"],
      downloadCount: "Download {count} {noun}",
      download: "Download",
      selectForDownload: "Select to download",
      finishSelecting: "Done selecting",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      nothingSelected: "Nothing selected",
    },

    reportsPage: {
      title: "Reports",
      lead: "Cash basis. What counts is the day the money came in or went out.",
      downloadCsv: "Download CSV",
      noData:
        "There are no payments or costs recorded for {year} yet. The report fills itself in as you record payments and add costs.",
      income: "Income",
      incomeHint: "payments from tenants",
      expenses: "Costs",
      expensesHint: "what the letting costs you",
      profit: "Profit",
      profitPositive: "in the black",
      profitNegative: "in the red",
      monthlyChart: "Income and costs by month",
      byProperty: "Result by property",
      currencyNote: "({currency})",
      noYearData: "No data for this year.",
      byCategory: "Costs by category",
      noCategoryData: "No costs recorded for this year yet.",
      property: "Property",
      collection: "Collection",
      collectionLead:
        "Measured against the due date: how much of what fell due in {year} has been settled.",
      settled: "Settled",
      settledHint: "{paid} of {invoiced}",
      paidLate: "Paid late",
      averageDelay: "Average delay",
      averageDelayHint: "counting only those paid late",
      days: ["day", "days"],
      /*
        Zastrzeżenie podatkowe pisane pod właściwy kraj. Brytyjski rok
        podatkowy biegnie od 6 kwietnia do 5 kwietnia, a ten raport liczy rok
        kalendarzowy — przepisanie tych liczb wprost do Self Assessment byłoby
        błędem, więc mówimy o tym wprost zamiast obiecywać zgodność.
      */
      disclaimer:
        "This summary is on a cash basis and runs to the calendar year. The UK tax year runs from 6 April to 5 April, so these figures do not map straight onto a Self Assessment return. It is not tax advice — check the numbers with your accountant.",
      deletedProperty: "property deleted",
      generalCosts: "General costs",
      /** Column headings in the CSV for the accountant. */
      csv: {
        heading: "Annual summary {year} (cash basis)",
        month: "Month",
        total: "TOTAL",
        category: "Cost category",
        amount: "Amount",
        fileName: "rentix-summary-{year}.csv",
      },
      chartNoValue: "none",
    },

    tenantPortal: {
      title: "Your tenancy",
      signOut: "Sign out",
      notLinkedTitle: "Your account is not linked to a tenancy yet",
      notLinkedLead:
        "Ask your landlord to link this account to your tenant record. Your tenancy and invoices will show up here once they do.",
      lead: "Your tenancy and invoices with {landlord}.",
      outstanding: "Outstanding: {amount}. The detail is in the invoices below.",
      settled: "Nothing outstanding. You are all settled.",
      noLeaseTitle: "No tenancy yet",
      noLeaseLead: "Once your landlord sets up the tenancy, it will appear here with the invoices.",
      rent: "Monthly rent",
      period: "Tenancy period",
      openEnded: "no end date",
      utilities: "Utilities",
      utilitiesAdvance: "Utilities allowance",
      perMonthSuffix: "{amount} / month",
      paymentTerm: "Payment term",
      paymentTermDays: "{days} days from the invoice date",
      invoices: "Invoices",
      noInvoices: "No invoices have been issued yet.",
      dueOn: "due {date}",
      landlord: "Landlord",
    },

    panelMisc: {
      deleteAccount: {
        title: "Delete account",
        lead: "This cannot be undone. There is no bin and no copy to restore from.",
        button: "Delete account",
        organizationGoesToo: "The organisation goes with the account",
        organizationStays:
          "stays, because it has other members. We only remove your account and your access to it.",
        password: "Password",
        confirmation: "Confirmation",
      },
      templateEditor: {
        subject: "Subject",
        subjectHint: "An empty field means the default text, shown behind it.",
        heading: "Heading above the text",
        intro: "Opening paragraph",
        outro: "Closing paragraph",
        saved: "Message text saved.",
        variables: "Variables you can insert",
        variablesHint: "Type the name in double braces. The value from the document takes its place.",
        testHint: "The test sends the last saved version. Save first to check your changes.",
      },
      cancelInvoice: {
        button: "Cancel document",
        confirm:
          "The document will be marked as cancelled. Its number stays taken, so the register has no gap.",
      },
      extendTitle: "Extending the tenancy",
      terminateTitle: "Ending the tenancy",
      roomPricingTitle: "Room rents",
      roomPricingLead: "Name the rooms and set the rents. You assign tenants to them afterwards.",
      roomPricingShort: "Room rents",
      leaseEditTitle: "Edit tenancy",
      leaseEditLead:
        "The property and the tenants are not changed here. That would be a different tenancy, not a correction.",
      settingsLead: "Your details, notifications to tenants, and your account.",
      leaseEditNotice:
        "The new terms apply to invoices raised from now on. Documents already issued stay exactly as they are. Correct them one by one if they need to change.",
      /** Strings scattered around the panel that belong to no single page. */
      generalExpense: "general cost",
      expenseNext: "next {date}",
      expenseAuto: "raised automatically",
      detailedFilters: "More filters",
      expensesTotal: "{amount} in total",
      invoiceStatusFilter: {
        all: "All",
        UNPAID: "Unpaid",
        OVERDUE: "Overdue",
        PAID: "Paid",
        CANCELLED: "Cancelled",
      },
      sentTo: "Document sent to {email}.",
      sendNow: "Send now",
      issuedButNotSent: "The document was issued, but sending it failed: {error}",
      removeLine: "Remove line {index}",
      fillAsDeposit: "Fill in as a deposit ({amount})",
      sendByEmailTo: "Email it to: {tenant}",
      leadTenant: "lead",
      removeTenant: "Remove {tenant}",
      propertyOccupiedOption: " (let)",
      roomOccupiedOption: " (let)",
      saveOwner: "Save owner",
      archiveConfirm: "Archive “{name}”?",
      archiveYes: "Yes, archive it",
      sectionOwner: "Owner",
      sectionArea: "Floor area",
      roomsTitle: "Rooms",
      roomsCount: ["room", "rooms"],
      roomsOccupied: "{occupied} of {total} let",
      roomsTotalRent: " · {amount} a month",
      roomsFreeLead: ["Free", "Free"],
      roomsFree: "{lead}: {count} {noun}.",
      roomsTotal: "{amount} a month in total",
      roomLease: "Tenancy",
      roomNoPrice: "no price",
      roomAssign: "Assign",
      roomAssignTitle: "Assign a tenant to room {room} at {property}",
      roomEdit: "Edit room {room}",
      roomDelete: "Delete room {room}",
      logoTooBig: "The image may weigh at most {max} kB. This one is {actual} kB.",
      logoHint:
        "PNG or JPEG, at most {max} kB. A landscape logo on a transparent or white background looks best.",
      changePassword: "Change password",
      sendTestToSelf: "Send a test to yourself",
      testSent: "Sample sent to {email}.",
      previewTitle: "Preview",
      previewSubject: "Subject:",
      previewFrameTitle: "Message preview: {type}",
      sectionPayments: "Payments",
      propertiesBack: "Properties",
      propertyCreated: "Property “{name}” created",
      noLeasesYet: "This tenant has no tenancy yet.",
      indefinite: "no end date",
      threadMessages: ["message", "messages"],
      insuranceExpired: " · expired",
      propertyFloor: " · floor {floor}",
      leaseTerminatedOn: "Tenancy ended {date}",
      leaseEditElsewhere: "Ending the tenancy and archiving it live on the tenancy page.",
      tenantPortalGreeting: "Hello, {name}",
      noInvoicesYet: "No documents have been issued against this tenancy yet. Rent is invoiced automatically on day {day} of the month",
      noInvoicesBefore: ", but not for periods starting before {date}.",
      dueOn: "due {date}",
      paymentsCount: ["payment", "payments"],
      deleteAccountLosses: " and everything belonging to it: {losses}.",
      deleteAccountForever: "Delete the account for good",
      deleteAccountPhraseHint: "Type it out: {phrase}",
      deleteAccountItems: {
        properties: ["property", "properties"],
        tenants: ["tenant", "tenants"],
        leases: ["tenancy", "tenancies"],
        invoices: ["document", "documents"],
        payments: ["payment", "payments"],
        expenses: ["cost", "costs"],
      },
      meta: {
        property: "Property",
        owner: "Owner",
        tenant: "Tenant",
        lease: "Tenancy",
        document: "Document",
      },
      yearPicker: "Report year",
      propertyExpensesEmpty:
        "Nothing recorded yet. A service charge, a utility bill or a mortgage payment added here goes straight into this property's numbers.",
    },

    dateInput: {
      /*
        Ten sam porządek co po polsku — dzień, miesiąc, rok — więc pomyłka
        o 3 grudnia zamiast 12 marca tu nie grozi. Różni się separator: kropka
        w brytyjskiej dacie wygląda na literówkę.
      */
      placeholder: "dd/mm/yyyy",
      openCalendar: "Pick from calendar",
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
      plans: {
        FREE: "Free plan",
        START: "Start plan",
        PRO: "Pro plan",
        PORTFOLIO: "Portfolio plan",
      },
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
      pages: {
        account: "Account settings",
        notifications: "Notification settings",
        messages: "Message settings",
        sellerIncomplete:
          "Add your address. Without it, invoices go out with your name only — and those are the documents your tenant and your accountant see.",
        messagesLead:
          "Write in plain text. The layout, colours and the amounts table are on our side, so the message does not fall apart in Outlook. An empty field keeps the default text.",
      },
      profile: {
        title: "Your profile",
        lead: "Only you see this in the dashboard.",
        saved: "Profile saved.",
        name: "Full name",
        phone: "Phone",
        email: "Email",
        emailHint: "This is your login. Changing it needs a word with support.",
      },
      password: {
        title: "Password",
        changed: "Your password has been changed.",
        current: "Current password",
        new: "New password",
        newHint: "At least 10 characters, with an upper-case letter, a lower-case letter and a digit.",
      },
      plan: {
        title: "Plan and limit",
        noun: ["tenancy", "tenancies"],
        usage: "{used} of {limit} {noun}",
        usageUnlimited: "{used} {noun}, no limit",
        tiers: "What each plan covers",
        tierLimit: "{limit} {noun}",
        tierUnlimited: "no limit",
        current: "Your plan",
        grandfathered: "Your account keeps a higher limit from its earlier terms.",
        note: "Changing plan goes live together with payments.",
      },
      logo: {
        title: "Logo on documents",
        lead: "Appears in the header of your rent invoices. Optional — without it the document looks exactly as it does now.",
        alt: "Your logo",
        empty: "No logo",
        readError: "We could not read that file. Try picking it again.",
        change: "Change logo",
        upload: "Upload logo",
      },
      notifications: {
        title: "Sender and timing",
        lead: "When reminders go out, and the name the tenant sees them under.",
        saved: "Notification settings saved.",
        senderName: "Sender name",
        reminderDays: "Days before the due date to remind",
        overdueDays: "Days between chasers after the due date",
        overdueHint: "Daily chasers end up in spam and stop getting through.",
        noContactEmail:
          "You have no contact address, so tenant replies have nowhere to go. Add one under Organisation.",
        types: {
          INVOICE_ISSUED: {
            label: "Invoice issued",
            hint: "Goes out once, when the invoice is issued. The PDF travels as an attachment.",
          },
          PAYMENT_REMINDER: {
            label: "Reminder before the due date",
            hint: "Goes out once, a few days before payment is due.",
          },
          PAYMENT_OVERDUE: {
            label: "Chaser after the due date",
            hint: "Goes out after the due date and repeats until a payment is recorded.",
          },
        },
        autoSend: "Send automatically: {type}",
        preview: "Message preview: {type}",
        togglesTitle: "What goes out automatically",
        togglesLead:
          "A notification switched off will not go out in the nightly run. It does not block sending a document by hand from the invoice list — that is a separate, deliberate click.",
      },
      seller: {
        title: "Your details",
        lead: "These appear on rent invoices as the sender and on tenancy records as the landlord.",
        saved: "Your details have been saved.",
        save: "Save",
        name: "Name",
        nameHint: "Your business name, or your own name if you let privately.",
        contactEmail: "Contact address for tenants",
        contactEmailHint: "Replies to payment notifications go here.",
        /*
          Odpowiednikiem NIP-u jest numer VAT, ale najem mieszkaniowy jest
          z VAT zwolniony, więc większość wynajmujących zostawia to pole puste.
        */
        taxId: "VAT number",
        taxIdHint: "Leave blank unless you are VAT registered.",
        street: "Street and number",
        postalCode: "Postcode",
        city: "Town or city",
        bankAccount: "Bank details for tenants",
        /* Sort code i numer konta razem, bo tak wpisuje się je do przelewu. */
        bankAccountHint:
          "Sort code and account number, 14 digits in total. Shown on rent invoices as the account to pay into. Leave blank if you collect rent another way.",
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
        organization: "Organisation not found.",
        account: "Account not found.",
        invoices: "No documents found.",
        selectedTenant: "The selected tenant was not found.",
        roomInProperty: "That room was not found in this property.",
        propertyRooms: "No rooms found for this property.",
      },
      /** Messages pinned to a single form field. */
      fields: {
        selectProperty: "Choose a property from the list",
        selectRoom: "Choose a room from the list",
        selectTenant: "Choose a tenant from the list",
        selectLease: "Choose a tenancy from the list",
        propertyOccupied: "The property is already let",
        roomOccupied: "The room is already let",
        wrongPassword: "Wrong password",
      },
      /** Nouns the messages below inflect for number. */
      countable: {
        documents: ["document", "documents"],
        properties: ["property", "properties"],
        leases: ["tenancy", "tenancies"],
        leasesOn: ["tenancy", "tenancies"],
      },
      invoiceHasPayments:
        "Payments are recorded against this document. Remove them first, or the money would sit in the books with nothing to explain it.",
      paymentOnCancelled:
        "This document is cancelled. The payment has to go against a different one.",
      invoiceNoRecipient:
        "The document has no recipient and no tenancy, so there is nobody to send it to.",
      tenantNoEmail:
        "The tenant has no email address. Add one on their record — there is nowhere to send the document.",
      batchPdfLimit:
        "At most {max} documents at once. Narrow the list with a filter and download it in parts.",
      propertyOccupiedMessage:
        "This property already has an active tenancy. End the previous one, pick a specific room, or save the new one as a draft.",
      roomOccupiedMessage:
        "This room already has an active tenancy. End the previous one or pick another room.",
      unitOccupied:
        "This unit already has an active tenancy. End it first — two active tenancies on one unit would break the occupancy figures.",
      leaseStillActive:
        "The tenancy is active. End it first, or the unit would stay occupied by a tenancy nobody can see on the list.",
      leaseLimitReached:
        "The {plan} covers {limit} {noun}. Archive a finished tenancy or move up a plan.",
      leaseHasInvoices:
        "Cannot delete. {count} {noun} were issued against this tenancy. Leave it in the archive so the payment history stays consistent.",
      ownerHasProperties:
        "Cannot delete. {count} {noun} are assigned to this owner. Detach them first, or leave the owner in the archive.",
      tenantHasLeases:
        "Cannot delete. This tenant appears on {count} {noun}. Archive them instead of deleting.",
      propertyHasLeases:
        "Cannot delete. {count} {noun} are linked to this property. Archive it instead of deleting.",
      roomHasLeases: "Cannot delete. The room has {count} {noun}. End it first.",
      noOrganization: "The account has no organisation.",
      externalProviderDelete:
        "This account signs in through an external provider. Deleting it needs a word with support.",
      externalProviderPassword:
        "This account signs in through an external provider and has no password to change.",
      sendFailed: "Could not send: {error}",
      ownerOnly: "This resource is for the account owner only.",
      rateLimited: "Too many attempts. Try again in a moment.",
      networkError: "No connection to the server. Check your internet and try again.",
      unknownError: "Something went wrong. Try again.",
      fixFields: "Please correct the highlighted fields.",
      noInvoiceSelected: "No document was selected.",
      alreadyCancelled: "This document is already cancelled.",
      cancelledNotSent: "This document is cancelled, so we are not sending it to the tenant.",
      noAccountEmail: "Your account has no email address to send the test to.",
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
      status: {
        DRAFT: "Draft",
        PAID: "Paid",
        PARTIALLY_PAID: "Part paid",
        DUE_SOON: "Due soon",
        OVERDUE: "Overdue",
        UPCOMING: "Upcoming",
        CANCELLED: "Cancelled",
      },
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
      vat: {
        /*
          Najem mieszkaniowy jest w Wielkiej Brytanii zwolniony z VAT, więc
          „Exempt" to stan domyślny. „Outside scope" odpowiada polskiemu „np.".
        */
        ZW: "Exempt",
        NP: "Outside scope",
        RATE_0: "0%",
        RATE_5: "5%",
        RATE_8: "8%",
        RATE_23: "23%",
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
      leaseDocument: {
        download: "Download PDF",
        /*
          Wzór umowy w Rentiksie jest napisany pod polskie prawo — najem
          okazjonalny, kaucja, wypowiedzenie według kodeksu cywilnego.
          W Wielkiej Brytanii obowiązuje AST z ochroną kaucji w rządowym
          schemacie depozytowym i sprawdzeniem Right to Rent, więc ten sam
          dokument nie tylko nie pasuje — wprowadzałby w błąd co do praw
          najemcy. Do czasu edytowalnego szablonu w ustawieniach nie
          wystawiamy go wcale.
        */
        unavailable:
          "The tenancy agreement template follows Polish law and does not apply to a UK tenancy, so it is not available here. Keep using your own AST.",
      },
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
        internetContractEnd: "Broadband contract ends",
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
  documents: {
    invoice: {
      batchTitle: "Rent documents ({count})",
      cancelled: " (CANCELLED)",
      numberPrefix: "no. ",
      issueDate: "Invoice date",
      /*
        Data sprzedaży jest wymogiem polskiej faktury (FA(2)). Na brytyjskim
        rachunku za czynsz nie znaczy nic — dokument pokazuje ją tylko wtedy,
        gdy naprawdę jest fakturą VAT, gdzie odpowiada tax point.
      */
      saleDate: "Supply date",
      dueDate: "Payment due",
      /*
        „Sprzedawca / nabywca" to język polskiej faktury. Brytyjski rachunek
        mówi po prostu, od kogo jest i do kogo.
      */
      seller: "From",
      buyer: "Bill to",
      taxIdLabel: "VAT no.",
      roomSubject: "room {name}",
      subject: "For: {subject}",
      period: "Period: {from} – {to}",
      noDate: "not set",
      columns: {
        index: "#",
        description: "Description",
        quantity: "Qty",
        unitPrice: "Unit price",
        vat: "VAT",
        net: "Net",
        gross: "Gross",
        amount: "Amount",
      },
      breakdown: "Net {rate} · VAT {vat}",
      totalNet: "Subtotal",
      totalVat: "VAT",
      totalDue: "Total due",
      /* Pusty tekst = wiersz „słownie" nie pojawia się na dokumencie. */
      amountInWords: "",
      /* Brytyjczyk podaje sort code i numer konta osobno — jeden ciąg cyfr nic mu nie mówi. */
      sortCode: "Sort code",
      accountNumber: "Account number",
      paymentLabel: "Pay by bank transfer to",
      /* Brytyjski wynajmujący prosi o numer w tytule przelewu — inaczej wpłaty nie da się dopasować. */
      paymentReference: "Please use {number} as the payment reference.",
      paidSoFar: "Paid so far",
      remaining: "Still to pay",
      chargeDisclaimer:
        "This is a statement of the amount and date due. It is not an invoice or a receipt and should not be used for accounting purposes. An invoice is available on request.",
      /* Rubryki podpisu to polska konwencja papierowa — na brytyjskim rachunku ich nie ma. */
      signedBy: "",
      receivedBy: "",
    },
    numberPrefix: {
      BILL: "INV",
      VAT_INVOICE: "VAT",
      PROFORMA: "PF",
      CHARGE: "CHG",
    },
  },

  emails: {
    attachmentNote: "The PDF is attached to this message.",
    attachmentPlain: "The PDF is attached to this message.",
    automaticFooter: "sent automatically by Rentix",

    rows: {
      number: "Invoice number",
      amount: "Amount",
      amountDue: "Amount due",
      dueDate: "Payment due",
      due: "Due",
      wasDue: "Was due",
    },

    days: ["day", "days"],

    issued: {
      subject: "{number}: {amount} due {due}",
      heading: "New invoice",
      intro: "Hello {name}. We have issued your rent invoice{period}.",
      introPeriod: " for {period}",
      outro: "If you have already paid, please treat this message as confirmation.",
    },

    reminder: {
      subject: "Reminder: {number}, due {due}",
      heading: "Payment due soon",
      intro: "Hello {name}. A quick reminder that a payment is due shortly.",
      outro: "If your payment is already on its way, please ignore this message.",
    },

    overdue: {
      subject: "Overdue: {number}, {amount}",
      heading: "Payment overdue",
      intro:
        "Hello {name}. The due date passed {days} {dayWord} ago and we have not recorded your payment yet.",
      outro:
        "If you paid in the last few days, please get in touch and we will check whether it has reached us.",
    },

    variables: {
      tenantFirstName: { name: "tenant_first_name", description: "Tenant first name", example: "James" },
      tenantLastName: {
        name: "tenant_last_name",
        description: "Tenant surname",
        example: "Doyle",
      },
      landlordName: {
        name: "landlord_name",
        description: "Your name or business name",
        example: "Harborne Lettings Ltd",
      },
      documentNumber: {
        name: "invoice_number",
        description: "Invoice number",
        example: "INV 6/08/2026",
      },
      amount: { name: "amount", description: "Invoice amount", example: "£629.03" },
      amountDue: {
        name: "amount_due",
        description: "Amount still outstanding",
        example: "£629.03",
      },
      dueDate: { name: "due_date", description: "Payment due date", example: "22 August 2026" },
      period: { name: "period", description: "Billing period", example: "August 2026" },
      daysOverdue: {
        name: "days_overdue",
        description: "Days since the due date",
        example: "5",
      },
      propertyAddress: {
        name: "property_address",
        description: "Address of the let property",
        example: "14 Station Road, Birmingham B17 9LN",
      },
    },
  },

  billing: {
    rentLine: "Rent for {period}",
    rentLineProrated: "Rent for {period} ({covered}/{total} days)",
    /*
      „Zaliczka na media" to po brytyjsku utilities allowance doliczany do
      czynszu — ta sama pozycja, inna nazwa.
    */
    utilitiesLine: "Utilities allowance for {period}",
    utilitiesLineProrated: "Utilities allowance for {period} ({covered}/{total} days)",
    unitMonth: "month",
    invoiceNote: "Rent for {period}.",
  },

};
