import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { parseIsoDay } from "@/lib/cleaning/rotation";
import {
  cleaningSchedule,
  clearCleaningSchedule,
  generateCleaningSchedule,
} from "@/lib/cleaning/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/properties/:id/cleaning — cała rozpiska nieruchomości. */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const schedule = await cleaningSchedule(auth.organizationId, id);

  if (!schedule) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  return ok(schedule);
}

/**
 * POST /api/properties/:id/cleaning — rozpisuje zakres od nowa.
 *
 * Ciało: `{ from: "2026-07-10", to: "2027-07-31" }`. Zakres idzie w ciele,
 * a nie w adresie: to jest zapis, a nie odczyt. Powtórzone żądanie zastępuje
 * całą rozpiskę — o to chodzi w „wygeneruj ponownie".
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const raw = (body ?? {}) as { from?: unknown; to?: unknown };
  const from = typeof raw.from === "string" ? parseIsoDay(raw.from) : null;
  const to = typeof raw.to === "string" ? parseIsoDay(raw.to) : null;
  if (!from || !to) return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningRangeInvalid);

  const { id } = await params;
  const result = await generateCleaningSchedule(auth.organizationId, id, { from, to });

  if (result.ok) return ok(result.schedule);

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
    case "RANGE_INVALID":
      return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningRangeInvalid);
    case "RANGE_TOO_LONG":
      return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningRangeTooLong);
    case "TOO_FEW_PARTICIPANTS":
      return apiError("CONFLICT", auth.d.panel.api.cleaningTooFewParticipants);
  }
}

/** DELETE /api/properties/:id/cleaning — kasuje całą rozpiskę. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const removed = await clearCleaningSchedule(auth.organizationId, id);

  return ok({ removed });
}
