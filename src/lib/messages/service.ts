import type { Prisma } from "@/generated/prisma/client";
import { recentRemoteEmails, remoteEmail, type RemoteEmail } from "@/lib/email/delivery";
import { prisma } from "@/lib/prisma";
import type { MessageListQuery } from "@/lib/validations/message";

import { DELIVERED_EVENTS, IN_TRANSIT_EVENTS, PROBLEM_EVENTS } from "./status";

/**
 * Zakładka „Wiadomości": każdy e-mail, który Rentix wysłał w imieniu konta.
 *
 * Źródłem jest `notifications` — każda wysyłka do najemcy zostawia tam wpis
 * z organizacją. Każde zapytanie w tym pliku zaczyna się od `organizationId`,
 * więc konto widzi wyłącznie własną korespondencję, nawet jeśli wszystkie
 * konta wysyłają przez ten sam klucz Resend.
 */

export const MESSAGES_PAGE_SIZE = 50;

/** Ile wpisów wstecz porównujemy z listą Resend przy dopasowywaniu starszych wysyłek. */
const MATCH_WINDOW_MS = 2 * 60_000;

function statusWhere(filter: MessageListQuery["status"]): Prisma.NotificationWhereInput {
  switch (filter) {
    case "delivered":
      return { status: "SENT", deliveryEvent: { in: DELIVERED_EVENTS } };
    case "sent":
      return {
        status: { in: ["SENT", "PENDING"] },
        OR: [{ deliveryEvent: null }, { deliveryEvent: { in: IN_TRANSIT_EVENTS } }],
      };
    case "failed":
      return { OR: [{ status: "FAILED" }, { deliveryEvent: { in: PROBLEM_EVENTS } }] };
    default:
      return {};
  }
}

export async function listSentEmails(organizationId: string, query: MessageListQuery) {
  await syncDeliveryEvents(organizationId);

  const and: Prisma.NotificationWhereInput[] = [statusWhere(query.status)];

  if (query.q) {
    const contains = { contains: query.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { toEmail: contains },
        { title: contains },
        { invoice: { number: contains } },
        { tenant: { lastName: contains } },
        { tenant: { firstName: contains } },
      ],
    });
  }

  if (query.period !== "all") {
    const days = Number(query.period);
    and.push({ createdAt: { gte: new Date(Date.now() - days * 86_400_000) } });
  }

  const where: Prisma.NotificationWhereInput = {
    organizationId,
    channel: "EMAIL",
    AND: and,
  };

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * MESSAGES_PAGE_SIZE,
      take: MESSAGES_PAGE_SIZE,
      select: {
        id: true,
        type: true,
        status: true,
        deliveryEvent: true,
        title: true,
        toEmail: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { rows, total };
}

/** Czy konto wysłało już cokolwiek — do rozróżnienia pustej historii od pustego filtra. */
export async function hasSentEmails(organizationId: string): Promise<boolean> {
  const first = await prisma.notification.findFirst({
    where: { organizationId, channel: "EMAIL" },
    select: { id: true },
  });
  return first !== null;
}

/**
 * Jedna wiadomość ze statusem prosto od Resend.
 *
 * Wiersze sprzed zapisywania kopii nie mają własnego HTML-a — jeśli Resend
 * jeszcze go trzyma, bierzemy go stamtąd i odkładamy, żeby następne otwarcie
 * nie musiało pytać.
 */
export async function getSentEmail(organizationId: string, id: string) {
  const email = await prisma.notification.findFirst({
    where: { id, organizationId, channel: "EMAIL" },
    select: {
      id: true,
      type: true,
      status: true,
      deliveryEvent: true,
      title: true,
      body: true,
      html: true,
      toEmail: true,
      fromAddress: true,
      replyTo: true,
      attachmentNames: true,
      providerId: true,
      error: true,
      createdAt: true,
      sentAt: true,
      tenant: { select: { id: true, firstName: true, lastName: true } },
      invoice: { select: { id: true, number: true } },
    },
  });

  if (!email?.providerId || email.status !== "SENT") return email;

  const remote = await remoteEmail(email.providerId);
  if (!remote) return email;

  const update: Prisma.NotificationUpdateInput = {};
  if (remote.event && remote.event !== email.deliveryEvent) update.deliveryEvent = remote.event;
  if (!email.html && remote.html) update.html = remote.html;

  if (Object.keys(update).length > 0) {
    await prisma.notification.update({ where: { id: email.id }, data: update });
  }

  return {
    ...email,
    deliveryEvent: remote.event ?? email.deliveryEvent,
    html: email.html ?? remote.html,
  };
}

/**
 * Dociąga statusy dostawy z Resend dla wpisów tego konta.
 *
 * Jedno zapytanie o ostatnie wysyłki całej platformy, a potem dopasowanie po
 * identyfikatorze. Wpisy sprzed zapisywania identyfikatora dopasowujemy po
 * adresie, temacie i chwili wysyłki — to te same wiadomości, tylko nie
 * wiedzieliśmy wtedy, pod jakim numerem Resend je prowadzi.
 */
export async function syncDeliveryEvents(organizationId: string): Promise<void> {
  const remote = await recentRemoteEmails();
  if (remote.length === 0) return;

  const oldest = Math.min(...remote.map((email) => email.createdAt.getTime()));

  const local = await prisma.notification.findMany({
    where: {
      organizationId,
      channel: "EMAIL",
      status: "SENT",
      OR: [
        { providerId: { in: remote.map((email) => email.id) } },
        { providerId: null, createdAt: { gte: new Date(oldest - MATCH_WINDOW_MS) } },
      ],
    },
    select: {
      id: true,
      providerId: true,
      deliveryEvent: true,
      toEmail: true,
      title: true,
      createdAt: true,
    },
  });

  if (local.length === 0) return;

  const byId = new Map(remote.map((email) => [email.id, email]));
  const claimed = new Set(local.map((row) => row.providerId).filter(Boolean));
  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (const row of local) {
    let match: RemoteEmail | undefined = row.providerId ? byId.get(row.providerId) : undefined;

    if (!row.providerId) {
      match = remote.find(
        (email) =>
          !claimed.has(email.id) &&
          email.subject === row.title &&
          email.to.some((to) => to.toLowerCase() === row.toEmail?.toLowerCase()) &&
          Math.abs(email.createdAt.getTime() - row.createdAt.getTime()) <= MATCH_WINDOW_MS,
      );
      if (match) claimed.add(match.id);
    }

    if (!match) continue;

    const data: Prisma.NotificationUpdateInput = {};
    if (!row.providerId) data.providerId = match.id;
    if (match.event && match.event !== row.deliveryEvent) data.deliveryEvent = match.event;

    if (Object.keys(data).length > 0) {
      updates.push(prisma.notification.update({ where: { id: row.id }, data }));
    }
  }

  if (updates.length > 0) await prisma.$transaction(updates);
}
