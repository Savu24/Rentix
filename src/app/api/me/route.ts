import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { getApiSession } from "@/lib/auth/session";
import { updateProfile } from "@/lib/organizations/service";
import { prisma } from "@/lib/prisma";
import { profileSettingsSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * GET /api/me
 *
 * Profil zalogowanego użytkownika wraz z jego organizacją.
 * Wzorzec dla wszystkich kolejnych endpointów: autoryzacja najpierw,
 * zapytanie zawężone do własnych danych, brak przekierowań — sam JSON.
 */
export async function GET() {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  const { session } = result;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      image: true,
      role: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    // Token jest ważny, ale konta już nie ma (usunięte w trakcie sesji).
    return ok({ id: session.user.id, deleted: true }, 410);
  }

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt,
    organizations: user.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    })),
  });
}

/**
 * PATCH /api/me — imię i telefon zalogowanego użytkownika.
 *
 * E-maila tu nie zmienimy: jest loginem, więc jego podmiana wymaga
 * potwierdzenia nowego adresu, a nie zwykłego zapisu formularza.
 */
export async function PATCH(request: NextRequest) {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = profileSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await updateProfile(result.session.user.id, parsed.data));
}
