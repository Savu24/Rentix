import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { deleteRoom, updateRoom } from "@/lib/properties/service";
import { roomUpdateSchema } from "@/lib/validations/property";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = roomUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const updated = await updateRoom(auth.organizationId, id, parsed.data);

  if (!updated) return apiError("NOT_FOUND", "Nie znaleziono pokoju.");
  return ok(updated);
}

/** DELETE /api/rooms/:id — kasuje pokój, o ile nie ma na nim umowy. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await deleteRoom(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") return apiError("NOT_FOUND", "Nie znaleziono pokoju.");

  return apiError(
    "CONFLICT",
    `Nie można usunąć — pokój ma ${result.leaseCount} ${
      result.leaseCount === 1 ? "umowę" : "umów"
    }. Zakończ ją najpierw.`,
  );
}
