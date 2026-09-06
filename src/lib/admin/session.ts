import { cache } from "react";
import { notFound } from "next/navigation";

import { apiError } from "@/lib/api/response";
import { getApiSession, requireSession, type AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Wejście do panelu administratora platformy.
 *
 * Rola `ADMIN` z enuma `UserRole` znaczy co innego niż `MembershipRole.ADMIN`
 * z zespołu: tamta daje pełne prawa w jednej organizacji, ta sięga ponad
 * wszystkie. Konto zachowuje przy tym swoje członkostwa i dalej pracuje we
 * własnym panelu — dostaje drugi panel obok, a nie zamiast.
 */

export type AdminActor = { id: string; email: string };

/**
 * Rola czytana z bazy, a nie z tokenu.
 *
 * Token sesji żyje trzydzieści dni i niesie rolę z chwili logowania. Przy
 * uprawnieniach tej mocy odebranie ich musi działać od razu, a nie po
 * miesiącu — dokładnie tak samo, jak przy odebraniu dostępu do organizacji
 * (patrz `requireApiOwner`). `cache` z Reacta zwija to do jednego zapytania
 * na żądanie, wspólnego dla layoutu i strony pod nim.
 */
const adminActor = cache(async (userId: string): Promise<AdminActor | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  return user?.role === "ADMIN" ? { id: user.id, email: user.email } : null;
});

/**
 * Dla Server Componentów `/admin`: wymusza rolę administratora platformy.
 *
 * Kto jej nie ma, dostaje 404, a nie 403. Panel administratora nie ma się
 * ogłaszać zalogowanym klientom — komunikat „brak uprawnień" potwierdzałby, że
 * pod tym adresem coś stoi, i zapraszał do szukania dziury.
 */
export async function requireAdminSession(returnTo = "/admin"): Promise<{
  session: AppSession;
  actor: AdminActor;
}> {
  const session = await requireSession(returnTo);
  const actor = await adminActor(session.user.id);

  if (!actor) notFound();

  return { session, actor };
}

/** Czy zalogowany widzi wejście do panelu administratora. */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  return (await adminActor(userId)) !== null;
}

/**
 * Dla endpointów `/api/admin/*`.
 *
 * Zwraca `actor`, bo każda zmiana z tego panelu idzie do dziennika audytu i
 * potrzebuje autora — endpoint nie ma jak zapisać wpisu bez niego.
 */
export async function requireApiAdmin(): Promise<
  { actor: AdminActor } | { response: ReturnType<typeof apiError> }
> {
  const result = await getApiSession();
  if ("response" in result) return result;

  const actor = await adminActor(result.session.user.id);

  // Ta sama odpowiedź co dla nieistniejącego adresu — z tego samego powodu,
  // dla którego strona zwraca 404.
  if (!actor) {
    return { response: apiError("NOT_FOUND", "Nie znaleziono zasobu.") };
  }

  return { actor };
}
