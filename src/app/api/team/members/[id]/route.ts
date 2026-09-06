import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiTeamManager } from "@/lib/auth/session";
import { changeMemberRole, removeMember, type MembershipChangeError } from "@/lib/team/service";
import { memberRoleSchema } from "@/lib/validations/team";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Wspólne tłumaczenie odmowy — oba czasowniki odbijają się o te same reguły. */
function failure(reason: MembershipChangeError, t: { notFound: string; ownerProtected: string; self: string }) {
  if (reason === "NOT_FOUND") return apiError("NOT_FOUND", t.notFound);
  return apiError("FORBIDDEN", reason === "OWNER_PROTECTED" ? t.ownerProtected : t.self);
}

/** PATCH /api/team/members/:id — zmiana roli w organizacji. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiTeamManager();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = memberRoleSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await changeMemberRole(
    auth.organizationId,
    auth.session.user.id,
    id,
    parsed.data.role,
  );

  if (!result.ok) return failure(result.reason, auth.d.panel.team.errors);
  return ok({ id, role: parsed.data.role });
}

/** DELETE /api/team/members/:id — odebranie dostępu do organizacji. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiTeamManager();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await removeMember(auth.organizationId, auth.session.user.id, id);

  if (!result.ok) return failure(result.reason, auth.d.panel.team.errors);
  return ok({ id, removed: true });
}
