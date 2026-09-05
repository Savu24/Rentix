import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { restoreTenant } from "@/lib/tenants/service";

export const runtime = "nodejs";

/** POST /api/tenants/:id/restore — wyjęcie najemcy z archiwum. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const restored = await restoreTenant(auth.organizationId, id);

  if (!restored) return apiError("NOT_FOUND", auth.d.panel.api.notFound.archivedTenant);
  return ok({ id, archivedAt: null });
}
