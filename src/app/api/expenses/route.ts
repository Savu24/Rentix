import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createExpense, listExpenses } from "@/lib/expenses/service";
import { expenseFormSchema, expenseListQuerySchema } from "@/lib/validations/expense";

export const runtime = "nodejs";

/** GET /api/expenses?q=&category=&propertyId=&year= */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = expenseListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listExpenses(auth.organizationId, parsed.data));
}

/**
 * POST /api/expenses
 *
 * 201 → { id }
 * 404 → nieruchomość spoza organizacji
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

  const parsed = expenseFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await createExpense(auth.organizationId, parsed.data);

  if (result.ok) return created(result.expense);

  return apiError("NOT_FOUND", "Nie znaleziono nieruchomości.", {
    fields: { propertyId: ["Wybierz nieruchomość z listy"] },
  });
}
