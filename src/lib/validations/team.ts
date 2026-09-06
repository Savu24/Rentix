import { z } from "zod";

import type { MembershipRole } from "@/generated/prisma/enums";
import type { ClientDictionary, Dictionary } from "@/lib/i18n/types";

import { emailSchema, passwordSchema } from "./auth";

/**
 * Zespół: zaproszenie, zmiana roli, przyjęcie zaproszenia.
 *
 * Jak reszta schematów — funkcje przyjmujące teksty, nie kod języka, żeby
 * przeglądarka nie ciągnęła słowników wszystkich wersji krajowych.
 */

/**
 * Role, które da się nadać z panelu.
 *
 * OWNER jest poza listą celowo: to założyciel konta i płatnik. Drugi OWNER
 * mógłby usunąć pierwszego, a konto zostałoby bez osoby odpowiedzialnej za
 * rozliczenia. Przekazanie własności to osobna operacja, której jeszcze nie ma.
 */
export const ASSIGNABLE_ROLES = ["ADMIN", "MEMBER"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Nazwy ról w języku konta. */
export function membershipRoleLabels(
  d: Pick<Dictionary, "panel">,
): Record<MembershipRole, string> {
  return d.panel.team.roles;
}

/** Co wolno komu — jedno zdanie pod nazwą roli w formularzu. */
export function membershipRoleHints(
  d: Pick<Dictionary, "panel">,
): Record<AssignableRole, string> {
  return d.panel.team.roleHints;
}

export function inviteMemberSchema(context: { d: ClientDictionary }) {
  return z.object({
    email: emailSchema(context.d.auth.validation),
    role: z.enum(ASSIGNABLE_ROLES, { message: context.d.panel.team.validation.roleRequired }),
  });
}

export type InviteMemberInput = z.input<ReturnType<typeof inviteMemberSchema>>;
export type InviteMemberOutput = z.output<ReturnType<typeof inviteMemberSchema>>;

export function memberRoleSchema(context: { d: ClientDictionary }) {
  return z.object({
    role: z.enum(ASSIGNABLE_ROLES, { message: context.d.panel.team.validation.roleRequired }),
  });
}

/**
 * Dane zakładane razem z kontem przyjmującego zaproszenie.
 *
 * Adresu nie ma w formularzu: bierze się z zaproszenia, więc nie da się
 * cudzym linkiem założyć konta na własny adres i wejść do organizacji.
 */
export function acceptInvitationSchema(context: { d: ClientDictionary }) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, context.d.auth.validation.nameRequired)
      .max(120, context.d.auth.validation.nameTooLong),
    password: passwordSchema(context.d.auth.validation),
  });
}

export type AcceptInvitationInput = z.input<ReturnType<typeof acceptInvitationSchema>>;
export type AcceptInvitationOutput = z.output<ReturnType<typeof acceptInvitationSchema>>;
