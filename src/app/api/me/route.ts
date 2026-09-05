import type { NextRequest } from "next/server";

import { apiError, ok, rateLimited, validationError } from "@/lib/api/response";
import { getApiSession, sessionLocaleContext } from "@/lib/auth/session";
import { deleteAccount, updateProfile } from "@/lib/organizations/service";
import { prisma } from "@/lib/prisma";
import { consume, LIMITS } from "@/lib/rate-limit";
import { accountDeleteSchema, profileSettingsSchema } from "@/lib/validations/settings";

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

  const context = await sessionLocaleContext(result.session);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", context.d.panel.api.invalidJson);
  }

  const parsed = profileSettingsSchema(context).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await updateProfile(result.session.user.id, parsed.data));
}

/**
 * DELETE /api/me — usunięcie konta wraz z organizacją.
 *
 * Nieodwracalne, więc wymaga hasła i przepisanej frazy potwierdzenia.
 * Limit prób jak przy zmianie hasła: przejęty, niezablokowany komputer nie
 * może pozwalać na zgadywanie hasła w nieskończoność.
 *
 * Sesji nie kasujemy tutaj — ciasteczko czyści `signOut()` po stronie
 * klienta, bo to on nim zarządza.
 */
export async function DELETE(request: NextRequest) {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  const { session } = result;
  const organizationId = session.user.organizationId;
  const context = await sessionLocaleContext(session);
  const t = context.d.panel.api;

  if (!organizationId) {
    return apiError("FORBIDDEN", t.noOrganization);
  }

  const rateKey = `account-delete:${session.user.id}`;
  const rate = await consume(rateKey, LIMITS.passwordChange);
  if (!rate.success) return rateLimited(rate.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", t.invalidJson);
  }

  const parsed = accountDeleteSchema(context).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const deleted = await deleteAccount(session.user.id, organizationId, parsed.data);

  if (deleted.ok) return ok({ deleted: true, deletedOrganization: deleted.deletedOrganization });

  switch (deleted.reason) {
    case "USER_NOT_FOUND":
      return apiError("NOT_FOUND", t.notFound.account);
    case "NO_PASSWORD_SET":
      return apiError(
        "CONFLICT",
        t.externalProviderDelete,
      );
    case "WRONG_PASSWORD":
      return apiError("VALIDATION_ERROR", t.fixFields, {
        fields: { currentPassword: [t.fields.wrongPassword] },
      });
  }
}
