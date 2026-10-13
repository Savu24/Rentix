import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  Eye,
  History,
  MousePointerClick,
  Pencil,
  Send,
  UserRoundSearch,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { LeaseStatus, TenantStatus } from "@/generated/prisma/enums";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { fill, pluralize } from "@/lib/i18n/format";
import {
  daysOverdue,
  INVOICE_STATUS_TONE,
  type DisplayInvoiceStatus,
} from "@/lib/invoices/status";
import { MESSAGE_STATUS_TONE, type MessageStatus } from "@/lib/messages/status";
import { LEASE_STATUS_TONE, leaseStatusLabels } from "@/lib/validations/lease";
import { TENANT_STATUS_TONE, tenantStatusLabels } from "@/lib/validations/tenant";

/*
  Plakietki statusów: kolor + ikona + krótka etykieta, te same na każdym
  ekranie (redesign/_generator/lib.mjs, `STATUS`). Ton pochodzi z mapy
  w `lib/validations`, etykieta ze słownika — tu dochodzi tylko ikona.
*/

const LEASE_ICON: Record<LeaseStatus, LucideIcon> = {
  DRAFT: Pencil,
  RESERVED: CalendarDays,
  ACTIVE: CheckCircle2,
  TERMINATED: CircleSlash,
  EXPIRED: Clock,
};

export function LeaseStatusBadge({
  status,
  d,
  size,
}: {
  status: LeaseStatus;
  d: Pick<Dictionary, "panel">;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge tone={LEASE_STATUS_TONE[status]} icon={LEASE_ICON[status]} size={size}>
      {leaseStatusLabels(d)[status]}
    </Badge>
  );
}

const TENANT_ICON: Record<TenantStatus, LucideIcon> = {
  PROSPECT: UserRoundSearch,
  ACTIVE: CheckCircle2,
  FORMER: History,
};

export function TenantStatusBadge({
  status,
  d,
  size,
}: {
  status: TenantStatus;
  d: Pick<Dictionary, "panel">;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge tone={TENANT_STATUS_TONE[status]} icon={TENANT_ICON[status]} size={size}>
      {tenantStatusLabels(d)[status]}
    </Badge>
  );
}

const INVOICE_ICON: Record<DisplayInvoiceStatus, LucideIcon> = {
  PAID: CheckCircle2,
  PARTIALLY_PAID: CircleDashed,
  DUE_SOON: Clock,
  OVERDUE: AlertCircle,
  UPCOMING: CalendarDays,
  DRAFT: Pencil,
  CANCELLED: CircleSlash,
};

/**
 * Status dokumentu — zawsze z `resolveInvoiceStatus()`, nigdy z kolumny w bazie.
 *
 * Z terminem płatności status dostaje liczbę dni („Zaległa 10 dni",
 * „Termin za 3 dni") — dni liczy `daysOverdue`, ta sama funkcja, która
 * rozstrzyga o samym statusie.
 */
export function InvoiceStatusBadge({
  status,
  d,
  size,
  due,
}: {
  status: DisplayInvoiceStatus;
  d: Pick<Dictionary, "panel">;
  size?: BadgeProps["size"];
  due?: { date: Date; now: Date; locale: Locale };
}) {
  const t = d.panel.invoices;
  let label = t.status[status];

  if (due && status === "OVERDUE") {
    const days = daysOverdue(due.date, due.now);
    label = fill(pluralize(due.locale, days, t.statusOverdueDays), { count: days });
  } else if (due && status === "DUE_SOON") {
    const days = -daysOverdue(due.date, due.now);
    label = days <= 0 ? t.statusDueToday : fill(pluralize(due.locale, days, t.statusDueIn), { count: days });
  }

  return (
    <Badge tone={INVOICE_STATUS_TONE[status]} icon={INVOICE_ICON[status]} size={size}>
      {label}
    </Badge>
  );
}

const MESSAGE_ICON: Record<MessageStatus, LucideIcon> = {
  queued: Clock,
  scheduled: CalendarDays,
  sent: Send,
  delivered: Check,
  opened: Eye,
  clicked: MousePointerClick,
  delivery_delayed: Clock,
  complained: AlertTriangle,
  bounced: XCircle,
  failed: AlertCircle,
  suppressed: Ban,
  canceled: CircleSlash,
};

/** Status wysłanego e-maila (redesign/17-*): ten sam słownik, co w Resend. */
export function MessageStatusBadge({
  status,
  d,
  size,
}: {
  status: MessageStatus;
  d: Pick<Dictionary, "panel">;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge tone={MESSAGE_STATUS_TONE[status]} icon={MESSAGE_ICON[status]} size={size}>
      {d.panel.messagesPage.status[status]}
    </Badge>
  );
}
