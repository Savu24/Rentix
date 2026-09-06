import type { NextRequest } from "next/server";

import { apiError, created, rateLimited, validationError } from "@/lib/api/response";
import { requireApiTeamManager } from "@/lib/auth/session";
import { inviteTeamMember } from "@/lib/invitations/service";
import { consume, LIMITS } from "@/lib/rate-limit";
import { inviteMemberSchema } from "@/lib/validations/team";

export const runtime = "nodejs";

/**
 * POST /api/team/invitations — zaproszenie współpracownika.
 *
 * Zaproszenie wystawiamy nawet wtedy, gdy wysyłka maila się nie powiedzie:
 * link już istnieje i da się go przekazać ręcznie, a odpowiedź niesie `sent`,
 * więc panel powie o tym wprost zamiast udawać sukces.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiTeamManager();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = inviteMemberSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  // Licznik na organizację, nie na użytkownika: przejęte konto administratora
  // dosypałoby sobie limitu, zapraszając przez kolejne konta w tym samym zespole.
  const rate = await consume(`invite:${auth.organizationId}`, LIMITS.invitations);
  if (!rate.success) return rateLimited(rate.retryAfterSeconds);

  const result = await inviteTeamMember(auth.organizationId, auth.session.user.id, parsed.data);

  if (!result.ok) {
    const t = auth.d.panel.team.errors;
    const message = {
      ALREADY_MEMBER: t.alreadyMember,
      TENANT_ACCOUNT: t.tenantAccount,
    }[result.reason];

    // Komunikat idzie i pod pole, i nad formularz: przyczyna jest w adresie,
    // więc przypięcie go do tego pola mówi, co konkretnie poprawić.
    return apiError("CONFLICT", message, { fields: { email: [message] } });
  }

  return created(result.invitation);
}
