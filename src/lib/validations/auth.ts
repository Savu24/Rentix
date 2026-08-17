import { z } from "zod";

/**
 * Schematy współdzielone przez formularz (React Hook Form) i API route.
 * Ta sama definicja po obu stronach = komunikaty błędów nie rozjeżdżają się
 * między walidacją w przeglądarce a walidacją na serwerze.
 */

export const passwordSchema = z
  .string()
  .min(10, "Hasło musi mieć co najmniej 10 znaków")
  .max(128, "Hasło może mieć najwyżej 128 znaków")
  .regex(/[a-ząćęłńóśźż]/, "Hasło musi zawierać małą literę")
  .regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Hasło musi zawierać wielką literę")
  .regex(/[0-9]/, "Hasło musi zawierać cyfrę");

/**
 * Kolejność jest istotna: najpierw normalizacja (trim + małe litery), dopiero
 * potem sprawdzenie formatu. Odwrotnie „ Jan@Przyklad.pl " zostałoby odrzucone
 * przez spacje, które i tak zaraz usuwamy — a użytkownicy wklejają adresy
 * z e-maili razem ze spacją.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(1, "Podaj adres e-mail")
      .max(254, "Adres e-mail jest za długi")
      .pipe(z.email("Nieprawidłowy adres e-mail")),
  );

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Podaj imię i nazwisko")
    .max(120, "Imię i nazwisko jest za długie"),
  organizationName: z
    .string()
    .trim()
    .min(2, "Podaj nazwę firmy lub swoje imię i nazwisko")
    .max(120, "Nazwa jest za długa"),
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Przy logowaniu nie sprawdzamy siły hasła — tylko czy w ogóle je podano.
  // Reguły złożoności mogły się zmienić od czasu założenia konta.
  password: z.string().min(1, "Podaj hasło"),
});

export type LoginInput = z.infer<typeof loginSchema>;
