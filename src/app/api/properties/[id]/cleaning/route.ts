import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import {
  cleaningSchedule,
  clearCleaningSchedule,
  generateCleaningSchedule,
} from "@/lib/cleaning/service";
import { monthKey, parseMonthKey } from "@/lib/cleaning/rotation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Miesiąc z żądania.
 *
 * Brak parametru znaczy „bieżący" — przycisk w panelu otwiera się właśnie na
 * nim, a adres bez `?month=` ma dawać to samo, co panel po wejściu.
 */
function readMonth(value: string | null) {
  if (!value) {
    const now = new Date();
    return parseMonthKey(monthKey(now.getUTCFullYear(), now.getUTCMonth()));
  }

  return parseMonthKey(value);
}

/** GET /api/properties/:id/cleaning?month=YYYY-MM */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const month = readMonth(request.nextUrl.searchParams.get("month"));
  if (!month) return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningMonthInvalid);

  const { id } = await params;
  const schedule = await cleaningSchedule(auth.organizationId, id, month);

  if (!schedule) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  return ok(schedule);
}

/**
 * POST /api/properties/:id/cleaning — rozpisuje miesiąc od nowa.
 *
 * Miesiąc idzie w ciele, a nie w adresie: to jest zapis, a nie odczyt.
 * Powtórzone żądanie nadpisuje ten sam miesiąc innym losowaniem — o to chodzi
 * w „wygeneruj ponownie".
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

  const raw = (body as { month?: unknown } | null)?.month;
  const month = readMonth(typeof raw === "string" ? raw : null);
  if (!month) return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningMonthInvalid);

  const { id } = await params;
  const result = await generateCleaningSchedule(auth.organizationId, id, month);

  if (result.ok) return ok(result.schedule);
  if (result.reason === "NOT_FOUND") {
    return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  }

  return apiError("CONFLICT", auth.d.panel.api.cleaningTooFewParticipants);
}

/** DELETE /api/properties/:id/cleaning?month=YYYY-MM */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const month = readMonth(request.nextUrl.searchParams.get("month"));
  if (!month) return apiError("VALIDATION_ERROR", auth.d.panel.api.cleaningMonthInvalid);

  const { id } = await params;
  const removed = await clearCleaningSchedule(auth.organizationId, id, month);

  return ok({ removed });
}
