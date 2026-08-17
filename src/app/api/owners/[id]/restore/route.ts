import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { restoreOwner } from "@/lib/owners/service";

export const runtime = "nodejs";

/** POST /api/owners/:id/restore — wyjęcie właściciela z archiwum. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const restored = await restoreOwner(auth.organizationId, id);

  if (!restored) return apiError("NOT_FOUND", "Nie znaleziono zarchiwizowanego właściciela.");
  return ok({ id, archivedAt: null });
}
