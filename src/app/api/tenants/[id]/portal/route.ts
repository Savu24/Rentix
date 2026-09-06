import type { NextRequest } from "next/server";

import { apiError, created, ok, rateLimited } from "@/lib/api/response";
import { requireApiFeature } from "@/lib/auth/session";
import { inviteTenant, revokeTenantPortalAccess } from "@/lib/invitations/service";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tenants/:id/portal — zaproszenie najemcy do portalu.
 *
 * To samo żądanie służy do ponowienia: poprzednie oczekujące zaproszenie
 * zostaje skasowane, więc stary link przestaje działać i w obiegu jest zawsze
 * najwyżej jeden ważny.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await requireApiFeature("TENANT_PORTAL");
  if ("response" in auth) return auth.response;

  // Wspólny licznik z zaproszeniami do zespołu — obie drogi wysyłają pocztę
  // z tego samego serwera pod adres wpisany w panelu.
  const rate = await consume(`invite:${auth.organizationId}`, LIMITS.invitations);
  if (!rate.success) return rateLimited(rate.retryAfterSeconds);

  const { id } = await params;
  const result = await inviteTenant(auth.organizationId, auth.session.user.id, id);

  if (!result.ok) {
    const t = auth.d.panel.tenantPortalAccess.errors;

    if (result.reason === "NOT_FOUND") {
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);
    }

    return apiError(
      "CONFLICT",
      {
        NO_EMAIL: t.noEmail,
        ALREADY_LINKED: t.alreadyLinked,
        OWNER_ACCOUNT: t.ownerAccount,
      }[result.reason],
    );
  }

  return created(result.invitation);
}

/** DELETE /api/tenants/:id/portal — odbiera najemcy dostęp, konta nie kasuje. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiFeature("TENANT_PORTAL");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const revoked = await revokeTenantPortalAccess(auth.organizationId, id);

  if (!revoked) return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);
  return ok({ id, revoked: true });
}
