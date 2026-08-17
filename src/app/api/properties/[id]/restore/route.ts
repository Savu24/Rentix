import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { restoreProperty } from "@/lib/properties/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/properties/:id/restore — zdejmuje archiwum z nieruchomości
 * i jej jednostek.
 *
 * Osobny endpoint zamiast `PATCH { archivedAt: null }`: przywracanie odtwarza
 * też jednostki, więc jest operacją, a nie zmianą pola. Trzymanie tego
 * w PATCH-u kusiłoby do wystawienia `archivedAt` do edycji z zewnątrz.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const restored = await restoreProperty(auth.organizationId, id);

  if (!restored) return apiError("NOT_FOUND", "Nie znaleziono zarchiwizowanej nieruchomości.");
  return ok({ id, archived: false });
}
