import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { deleteExpense, getExpense, updateExpense } from "@/lib/expenses/service";
import { expenseUpdateSchema } from "@/lib/validations/expense";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/expenses/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const expense = await getExpense(auth.organizationId, id);

  if (!expense) return apiError("NOT_FOUND", "Nie znaleziono kosztu.");
  return ok(expense);
}

/** PATCH /api/expenses/:id */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = expenseUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await updateExpense(auth.organizationId, id, parsed.data);

  if (result.ok) return ok(result.expense);

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono kosztu.");
    case "PROPERTY_NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono nieruchomości.", {
        fields: { propertyId: ["Wybierz nieruchomość z listy"] },
      });
  }
}

/**
 * DELETE /api/expenses/:id
 *
 * Usuwamy naprawdę, bez archiwizacji: koszt to zapis pomocniczy właściciela,
 * a nie dokument z numerem w rejestrze.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const removed = await deleteExpense(auth.organizationId, id);

  if (!removed) return apiError("NOT_FOUND", "Nie znaleziono kosztu.");
  return ok({ id, deleted: true });
}
