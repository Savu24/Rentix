import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { generateInvoicesForMonth } from "@/lib/invoices/service";
import { generateInvoicesSchema } from "@/lib/validations/invoice";

export const runtime = "nodejs";

/**
 * POST /api/invoices/generate — naliczenie czynszu za wskazany miesiąc.
 *
 * To samo wywołanie, którego używa cron; tutaj odpala je użytkownik, gdy chce
 * naliczyć wcześniej albo uzupełnić zaległy miesiąc. Operacja jest
 * idempotentna — umowa z dokumentem za ten okres zostaje pominięta, więc
 * dwukrotne kliknięcie nie wystawi dwóch rachunków.
 *
 * 200 → { created: [...], skipped: [...] }
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = generateInvoicesSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await generateInvoicesForMonth(auth.organizationId, parsed.data);
  return ok(result);
}
