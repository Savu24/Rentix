import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { leaseLimitMessage } from "@/lib/billing/message";
import { restoreLease } from "@/lib/leases/service";

export const runtime = "nodejs";

/** POST /api/leases/:id/restore — wyjęcie umowy z archiwum. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const restored = await restoreLease(auth.organizationId, id);

  if (!restored.ok) {
    return restored.reason === "LEASE_LIMIT"
      ? apiError("CONFLICT", leaseLimitMessage(auth, restored.plan, restored.limit))
      : apiError("NOT_FOUND", auth.d.panel.api.notFound.archivedLease);
  }

  return ok({ id, archivedAt: null });
}
