import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/admin/session";
import { runAdminUserAction } from "@/lib/admin/users";
import { userActionSchema } from "@/lib/validations/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/users/:id — nadanie uprawnień albo potwierdzenie e-maila.
 *
 * Jeden endpoint na obie operacje, rozróżniane polem `action`: obie są
 * pojedynczą zmianą na tym samym koncie i dzielą całą autoryzację. Osobne
 * adresy znaczyłyby dwa razy ten sam kod wokół jednej linijki różnicy.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiAdmin();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Nieprawidłowy JSON w treści żądania.");
  }

  const parsed = userActionSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await runAdminUserAction(auth.actor, id, parsed.data);

  if (!result.ok) return apiError(result.code, result.message);

  return ok({ id });
}
