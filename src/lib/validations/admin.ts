import { z } from "zod";

import { AdminAction, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Schematy panelu administratora platformy.
 *
 * Bez wstrzykiwania słownika, inaczej niż reszta walidacji: ten panel istnieje
 * wyłącznie po polsku, bo jego jedynym odbiorcą jest operator Rentiksa.
 * Komunikaty stoją więc wprost w schemacie.
 */

export const organizationSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  plan: z.enum(SubscriptionPlan).optional(),
  status: z.enum(SubscriptionStatus).optional(),
});

export type OrganizationSearch = z.output<typeof organizationSearchSchema>;

/**
 * Zmiana subskrypcji jednej organizacji.
 *
 * Wszystkie pola opcjonalne, bo formularz wysyła tylko to, co administrator
 * ruszył — a każde zmienione pole trafia do dziennika jako osobny wpis.
 */
export const subscriptionUpdateSchema = z
  .object({
    plan: z.enum(SubscriptionPlan).optional(),
    /**
     * Próg umów zapisany wprost. Puste pole znaczy „wróć do progu z planu",
     * a nie „bez limitu" — brak limitu daje wyłącznie plan Portfel, żeby
     * pomyłka w formularzu nie rozdawała nieograniczonych kont.
     */
    leaseLimit: z
      /*
        Pusty napis musi być sprawdzany PRZED liczbą: `z.coerce.number()`
        zamienia "" na zero, więc przy odwrotnej kolejności wyczyszczone pole
        ustawiałoby limit na zero umów zamiast wracać do progu z planu.

        Brak pola i pole puste to dwie różne rzeczy: `undefined` znaczy „nie
        ruszaj limitu", `null` — „wróć do progu z planu".
      */
      .union([z.literal(""), z.coerce.number().int().min(0).max(100_000)])
      .optional()
      .transform((value) => (value === "" ? null : value)),
    billingExempt: z.boolean().optional(),
    status: z.enum(SubscriptionStatus).optional(),
  })
  .refine(
    (value) =>
      value.plan !== undefined ||
      value.leaseLimit !== undefined ||
      value.billingExempt !== undefined ||
      value.status !== undefined,
    { message: "Nie ma czego zapisać — nic nie zostało zmienione." },
  );

export type SubscriptionUpdateInput = z.input<typeof subscriptionUpdateSchema>;
export type SubscriptionUpdateOutput = z.output<typeof subscriptionUpdateSchema>;

export const userSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(["OWNER", "TENANT", "ADMIN"]).optional(),
});

export type UserSearch = z.output<typeof userSearchSchema>;

/**
 * Operacje na koncie użytkownika.
 *
 * Lista zamknięta zamiast dowolnych pól: panel administratora ma nadawać
 * uprawnienia i odblokowywać konta, a nie służyć za edytor cudzych danych.
 * Zmiana nazwiska czy adresu należy do właściciela konta.
 */
export const userActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SET_ROLE"),
    /**
     * Bez roli TENANT: przeniosłaby konto do portalu najemcy i odcięła je od
     * organizacji, w których pracuje. Najemcę tworzy zaproszenie z panelu
     * wynajmującego, a nie przełącznik roli.
     */
    role: z.enum(["OWNER", "ADMIN"], { message: "Nieznana rola." }),
  }),
  z.object({ action: z.literal("VERIFY_EMAIL") }),
]);

export type UserActionOutput = z.output<typeof userActionSchema>;

/** Nazwy planów i statusów — panel administratora nie przechodzi przez i18n. */
export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Darmowy",
  START: "Start",
  PRO: "Pro",
  PORTFOLIO: "Portfel",
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Aktywna",
  PAST_DUE: "Zaległość",
  CANCELLED: "Anulowana",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  OWNER: "Wynajmujący",
  TENANT: "Najemca",
  ADMIN: "Administrator",
};

/**
 * Opisy akcji w dzienniku audytu.
 *
 * Tutaj, a nie przy `recordAdminAction`: tamten moduł ciągnie Prismę, więc
 * import samej etykiety wciągałby połączenie z bazą wszędzie, gdzie trzeba
 * tylko napisu — łącznie z testami.
 */
export const ADMIN_ACTION_LABELS: Record<AdminAction, string> = {
  PLAN_CHANGED: "Zmiana planu",
  LEASE_LIMIT_CHANGED: "Zmiana limitu umów",
  BILLING_EXEMPT_CHANGED: "Zwolnienie z opłat",
  SUBSCRIPTION_STATUS_CHANGED: "Zmiana statusu subskrypcji",
  USER_ROLE_CHANGED: "Zmiana roli konta",
  USER_EMAIL_VERIFIED: "Ręczne potwierdzenie e-maila",
};
