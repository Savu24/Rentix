import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { archiveOwner, deleteOwner, getOwner, restoreOwner, updateOwner } from "@/lib/owners/service";
import { ownerUpdateSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/owners/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const owner = await getOwner(auth.organizationId, id);

  if (!owner) return apiError("NOT_FOUND", "Nie znaleziono właściciela.");
  return ok(owner);
}

/** PATCH /api/owners/:id */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = ownerUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;

  // `restore` przychodzi osobnym kluczem, bo to przywrócenie z archiwum,
  // a nie edycja pola — schemat formularza nie ma o nim pojęcia.
  if ((body as { restore?: unknown }).restore === true) {
    const restored = await restoreOwner(auth.organizationId, id);
    if (!restored) return apiError("NOT_FOUND", "Nie znaleziono zarchiwizowanego właściciela.");
    return ok({ id, archivedAt: null });
  }

  const owner = await updateOwner(auth.organizationId, id, parsed.data);
  if (!owner) return apiError("NOT_FOUND", "Nie znaleziono właściciela.");

  return ok(owner);
}

/**
 * DELETE /api/owners/:id — archiwizacja, nie skasowanie.
 *
 * Właściciel wisi przy nieruchomościach, a te przy umowach i fakturach.
 * Usunięcie zerwałoby powiązanie w historii rozliczeń, która ma zostać
 * czytelna także po zakończeniu współpracy.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  // `?force=true` = usunięcie trwałe, jak przy nieruchomościach i najemcach.
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const archived = await archiveOwner(auth.organizationId, id);
    if (!archived) return apiError("NOT_FOUND", "Nie znaleziono właściciela.");
    return ok({ id, archived: true });
  }

  const result = await deleteOwner(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") return apiError("NOT_FOUND", "Nie znaleziono właściciela.");

  return apiError(
    "CONFLICT",
    `Nie można usunąć — do właściciela przypisano ${result.propertyCount} ${
      result.propertyCount === 1 ? "nieruchomość" : "nieruchomości"
    }. Odepnij je najpierw albo zostaw właściciela w archiwum.`,
  );
}
