import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiTeamManager } from "@/lib/auth/session";
import { cancelInvitation } from "@/lib/invitations/service";

export const runtime = "nodejs";

/** DELETE /api/team/invitations/:id — cofa zaproszenie i unieważnia link. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiTeamManager();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const cancelled = await cancelInvitation(auth.organizationId, id);

  if (!cancelled) return apiError("NOT_FOUND", auth.d.panel.api.notFound.invitation);
  return ok({ id, cancelled: true });
}
