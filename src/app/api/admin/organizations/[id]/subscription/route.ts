import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { updateAdminSubscription } from "@/lib/admin/organizations";
import { requireApiAdmin } from "@/lib/admin/session";
import { subscriptionUpdateSchema } from "@/lib/validations/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/organizations/:id/subscription
 *
 * Jedyna droga, którą plan konta zmienia się dziś ręcznie — dopóki nie ma
 * operatora płatności. Zapis idzie razem z wpisem do dziennika audytu (patrz
 * `updateAdminSubscription`), więc endpoint nie ma tu nic do dołożenia poza
 * autoryzacją i walidacją.
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

  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const organization = await updateAdminSubscription(auth.actor, id, parsed.data);

  if (!organization) return apiError("NOT_FOUND", "Nie ma takiej organizacji.");

  return ok({
    plan: organization.usage.plan,
    limit: organization.usage.limit,
    status: organization.status,
    billingExempt: organization.billingExempt,
  });
}
