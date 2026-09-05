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
};
