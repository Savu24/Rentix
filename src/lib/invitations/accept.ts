import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

import { hashToken } from "./tokens";

/**
 * Przyjęcie zaproszenia.
 *
 * Osobno od `service.ts`, bo tylko tutaj zakładamy konta i mieszamy hasła —
 * a `service.ts` czyta i wystawia zaproszenia z panelu, gdzie tego kodu
 * nie ma po co widzieć.
 *
 * Dwie drogi wejścia:
 *
 * 1. **Zalogowany** klika link — dopinamy zaproszenie do jego konta.
 * 2. **Niezalogowany bez konta** podaje imię i hasło — zakładamy konto i od
 *    razu je dopinamy.
 *
 * Trzecia sytuacja, czyli niezalogowany, który konto ma, nie dochodzi tutaj:
 * strona odsyła go najpierw na logowanie z adresem powrotu. Zakładanie konta
 * „na wszelki wypadek" dałoby dwa konta na jeden adres, a przyjęcie zaproszenia
 * bez podania hasła — wejście do organizacji każdemu, kto zobaczy link.
 *
 * Własna organizacja zapraszanego niczemu nie przeszkadza: konto bywa
 * w kilku naraz, a między nimi przełącza się w pasku górnym panelu. Świeżo
 * przyjęte zaproszenie od razu staje się bieżącym wyborem — inaczej kliknięcie
 * w link kończyłoby się widokiem organizacji, o którą nikt nie prosił.
 */

export type AcceptFailure =
  | "NOT_FOUND"
  | "EXPIRED"
  | "ACCEPTED"
  /** Zalogowany innym adresem niż ten z zaproszenia. */
  | "WRONG_ACCOUNT"
  /** Konto istnieje — trzeba się nim zalogować, zanim przyjmiemy zaproszenie. */
  | "NEEDS_LOGIN"
  /** Konto najemcy nie może wejść do panelu organizacji i odwrotnie. */
  | "WRONG_ACCOUNT_TYPE"
  /** Kartotekę zdążyło przejąć inne konto. */
  | "ALREADY_LINKED";

export type AcceptResult =
  | {
      ok: true;
      /** Adres konta — strona loguje nim po założeniu. */
      email: string;
      /** Czy konto powstało w tej operacji. */
      created: boolean;
      /** Panel właściciela albo portal najemcy. */
      redirectTo: string;
    }
  | { ok: false; reason: AcceptFailure };

export type AcceptInput =
  /** Kliknięcie „Dołącz" przez zalogowanego. */
  | { kind: "session"; userId: string }
  /** Formularz zakładania konta. */
  | { kind: "new-account"; name: string; password: string };

/**
 * Przyjmuje zaproszenie w jednej transakcji.
 *
 * Zaproszenie odczytujemy ponownie w środku, mimo że strona już je pokazała:
 * między wyświetleniem a kliknięciem mogło zostać cofnięte albo przyjęte
 * z innego urządzenia, a `acceptedAt` jest jedynym miejscem, które o tym wie.
 */
export async function acceptInvitation(
  token: string,
  input: AcceptInput,
): Promise<AcceptResult> {
  const tokenHash = hashToken(token);

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        kind: true,
        email: true,
        role: true,
        tenantId: true,
        organizationId: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });

    if (!invitation) return { ok: false, reason: "NOT_FOUND" } as const;
    if (invitation.acceptedAt) return { ok: false, reason: "ACCEPTED" } as const;
    if (invitation.expiresAt <= new Date()) return { ok: false, reason: "EXPIRED" } as const;

    const isTeam = invitation.kind === "TEAM";

    // ── Konto, do którego dopinamy zaproszenie ──────────────────────────────
    let userId: string;
    let created = false;

    if (input.kind === "session") {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) return { ok: false, reason: "NOT_FOUND" } as const;

      // Adres musi się zgadzać: inaczej przekazany dalej link wpuszczałby
      // do cudzej organizacji każdego, kto akurat jest zalogowany.
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return { ok: false, reason: "WRONG_ACCOUNT" } as const;
      }

      if (isTeam ? user.role === "TENANT" : user.role !== "TENANT") {
        return { ok: false, reason: "WRONG_ACCOUNT_TYPE" } as const;
      }

      userId = user.id;
    } else {
      const existing = await tx.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      });

      if (existing) return { ok: false, reason: "NEEDS_LOGIN" } as const;

      const user = await tx.user.create({
        data: {
          email: invitation.email,
          name: input.name,
          passwordHash: await hashPassword(input.password),
          // Rola globalna rozstrzyga, do którego panelu konto trafia po
          // zalogowaniu. Współpracownik pracuje w panelu wynajmującego, więc
          // dostaje OWNER; jego uprawnienia w organizacji niesie członkostwo.
          role: isTeam ? "OWNER" : "TENANT",
          // Adres potwierdzony samym kliknięciem w link z tej skrzynki.
          emailVerified: new Date(),
        },
        select: { id: true },
      });

      userId = user.id;
      created = true;
    }

    // ── Zapis, który różni oba rodzaje zaproszeń ────────────────────────────
    if (isTeam) {
      await tx.membership.upsert({
        where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
        // Ponowne przyjęcie nie obniża roli komuś, kto już jest w zespole.
        update: {},
        create: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role ?? "MEMBER",
        },
      });

      /*
        Świeżo przyjęte zaproszenie zostaje bieżącą organizacją. Konto, które
        prowadzi już własny najem, po kliknięciu w link trafiłoby inaczej
        z powrotem do siebie i musiałoby samo zgadnąć, że gdzieś w pasku
        pojawiła się nowa pozycja.
      */
      await tx.user.update({
        where: { id: userId },
        data: { activeOrganizationId: invitation.organizationId },
      });
    } else {
      if (!invitation.tenantId) return { ok: false, reason: "NOT_FOUND" } as const;

      const tenant = await tx.tenant.findUnique({
        where: { id: invitation.tenantId },
        select: { userId: true },
      });

      if (!tenant) return { ok: false, reason: "NOT_FOUND" } as const;
      if (tenant.userId && tenant.userId !== userId) {
        return { ok: false, reason: "ALREADY_LINKED" } as const;
      }

      await tx.tenant.update({
        where: { id: invitation.tenantId },
        data: { userId },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      ok: true,
      email: invitation.email,
      created,
      redirectTo: isTeam ? "/panel" : "/najemca",
    } as const;
  });
}
