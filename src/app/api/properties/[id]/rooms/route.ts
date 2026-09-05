import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createRoom, listRooms, updateRoomsBulk } from "@/lib/properties/service";
import { roomFormSchema, roomsBulkUpdateSchema } from "@/lib/validations/property";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/properties/:id/rooms */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  return ok(await listRooms(auth.organizationId, id));
}

/** POST /api/properties/:id/rooms — dokłada pojedynczy pokój. */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = roomFormSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const room = await createRoom(auth.organizationId, id, parsed.data);

  if (!room) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  return created(room);
}

/**
 * PATCH /api/properties/:id/rooms — zapisuje nazwy i ceny wszystkich pokoi.
 *
 * Krok „wpisz ceny" po założeniu nieruchomości. Jedno żądanie zamiast N,
 * żeby nie zapisała się połowa cen.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = roomsBulkUpdateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const rooms = await updateRoomsBulk(auth.organizationId, id, parsed.data.rooms);

  if (!rooms) return apiError("NOT_FOUND", auth.d.panel.api.notFound.propertyRooms);
  return ok(rooms);
}
