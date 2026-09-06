import type { AdminAction, AdminTargetType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import type { AdminActor } from "./session";

/**
 * Dziennik zmian wykonanych z panelu administratora.
 *
 * Zapis jest obowiązkowy przy każdej akcji, która cokolwiek zmienia — stąd
 * `recordAdminAction` woła się w tej samej funkcji serwisowej, co `update`,
 * a nie w endpointach. Endpointów przybywa, a każdy kolejny mógłby zapomnieć.
 */

export type AdminAuditEntry = {
  id: string;
  actorEmail: string;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  targetLabel: string;
  before: string | null;
  after: string | null;
  createdAt: Date;
};

export type AdminActionInput = {
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  targetLabel: string;
  before?: string | null;
  after?: string | null;
};

export async function recordAdminAction(
  actor: AdminActor,
  input: AdminActionInput,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      before: input.before ?? null,
      after: input.after ?? null,
    },
  });
}

/**
 * Ostatnie wpisy — całość albo historia jednego celu.
 *
 * Bez stronicowania: dziennik czyta się od końca i po to, żeby zobaczyć, co
 * działo się ostatnio. Kto szuka wpisu sprzed roku, ma filtr po celu.
 */
export function listAdminAuditLog(options?: {
  target?: { type: AdminTargetType; id: string };
  limit?: number;
}): Promise<AdminAuditEntry[]> {
  return prisma.adminAuditLog.findMany({
    where: options?.target
      ? { targetType: options.target.type, targetId: options.target.id }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      targetType: true,
      targetId: true,
      targetLabel: true,
      before: true,
      after: true,
      createdAt: true,
    },
  });
}
