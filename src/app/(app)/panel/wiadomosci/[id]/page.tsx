import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Paperclip,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { MessageContent } from "@/components/panel/messages/message-content";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatDateIn } from "@/lib/i18n/format";
import { getSentEmail } from "@/lib/messages/service";
import {
  DELIVERED_EVENTS,
  MESSAGE_STATUS_TONE,
  PROBLEM_EVENTS,
  resolveMessageStatus,
  type MessageStatus,
} from "@/lib/messages/status";
import { isEditableType } from "@/lib/notifications/types";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.messagesPage.title };
}

const STATUS_ICON: Partial<Record<MessageStatus, LucideIcon>> = {
  delivered: CheckCircle2,
  opened: CheckCircle2,
  clicked: CheckCircle2,
  delivery_delayed: Clock,
  bounced: AlertTriangle,
  complained: AlertTriangle,
  suppressed: AlertTriangle,
  canceled: XCircle,
};

const TONE_TEXT = {
  neutral: "text-muted",
  accent: "text-accent",
  good: "text-good",
  warning: "text-warn",
  critical: "text-bad",
} as const;

export default async function MessageDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.messagesPage;
  const session = await requireOwnerSession();
  const { id } = await params;

  const email = await getSentEmail(session.user.organizationId, id);
  if (!email) notFound();

  const status = resolveMessageStatus(email);
  const tone = MESSAGE_STATUS_TONE[status];
  const sentAt = email.sentAt ?? email.createdAt;
  const hint =
    status in t.detail.statusHints
      ? t.detail.statusHints[status as keyof typeof t.detail.statusHints]
      : null;

  /*
    Oś zdarzeń: wysyłka z naszą godziną, a za nią — jeśli Resend wie coś
    więcej — ostatni stan dostawy. Resend nie podaje godziny tego stanu
    w odpowiedzi, więc nie zmyślamy jej.
  */
  const followUp =
    email.status === "SENT" &&
    (DELIVERED_EVENTS.includes(status) ||
      PROBLEM_EVENTS.includes(status) ||
      status === "delivery_delayed")
      ? status
      : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/wiadomosci"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>

        <div className="flex items-center gap-3.5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface-alt"
            aria-hidden
          >
            <Mail className="h-5 w-5 text-muted" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted">{t.detail.kind}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display truncate text-[24px] leading-tight text-fg">
                {email.toEmail ?? "—"}
              </h1>
              <Badge tone={tone}>{t.status[status]}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
          <Field label={t.detail.from}>{email.fromAddress ?? "—"}</Field>
          <Field label={t.detail.subject}>{email.title}</Field>
          <Field label={t.detail.to}>{email.toEmail ?? "—"}</Field>
          <Field label={t.detail.id}>
            <span className="font-mono text-xs">{email.providerId ?? email.id}</span>
          </Field>
          {email.replyTo ? <Field label={t.detail.replyTo}>{email.replyTo}</Field> : null}
          <Field label={t.detail.type}>
            {d.panel.tenantsPage.detail.notificationTypes[email.type]}
          </Field>
          {email.invoice ? (
            <Field label={t.detail.document}>
              <Link
                href={`/panel/finanse/${email.invoice.id}`}
                className="font-mono text-accent hover:underline"
              >
                {email.invoice.number}
              </Link>
            </Field>
          ) : null}
          {email.tenant ? (
            <Field label={t.detail.tenant}>
              <Link href={`/panel/najemcy/${email.tenant.id}`} className="text-accent hover:underline">
                {email.tenant.firstName} {email.tenant.lastName}
              </Link>
            </Field>
          ) : null}
          {email.attachmentNames.length > 0 ? (
            <Field label={t.detail.attachments}>
              <span className="flex flex-col gap-1">
                {email.attachmentNames.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-muted" aria-hidden />
                    {name}
                  </span>
                ))}
              </span>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{t.detail.events}</h2>
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
          <TimelineStep
            icon={email.status === "FAILED" ? XCircle : Send}
            toneClass={email.status === "FAILED" ? TONE_TEXT.critical : TONE_TEXT.accent}
            label={email.status === "FAILED" ? t.detail.eventFailed : t.detail.eventSent}
            meta={formatDateIn(sentAt, locale, "dateTime")}
          />
          {followUp ? (
            <>
              <li
                aria-hidden
                className="ml-[15px] h-4 border-l border-dashed border-border sm:mx-3 sm:ml-3 sm:h-0 sm:w-16 sm:border-l-0 sm:border-t"
              />
              <TimelineStep
                icon={STATUS_ICON[followUp] ?? CheckCircle2}
                toneClass={TONE_TEXT[MESSAGE_STATUS_TONE[followUp]]}
                label={t.status[followUp]}
                meta={t.detail.eventLatest}
              />
            </>
          ) : null}
        </ol>
      </section>

      {email.status === "FAILED" || hint ? (
        <Alert tone={email.status === "FAILED" || PROBLEM_EVENTS.includes(status) ? "error" : "warning"}>
          <span className="flex flex-col gap-1">
            {hint ? <span>{hint}</span> : null}
            {email.error ? (
              <span className="text-xs text-muted">
                {t.detail.errorTitle}: <span className="font-mono">{email.error}</span>
              </span>
            ) : null}
          </span>
        </Alert>
      ) : null}

      <MessageContent subject={email.title} html={email.html} text={email.body} />

      {isEditableType(email.type) ? (
        <Link
          href="/panel/ustawienia/wiadomosci"
          className="w-fit text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t.detail.editTemplate}
        </Link>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="break-words text-sm text-fg">{children}</span>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  toneClass,
  label,
  meta,
}: {
  icon: LucideIcon;
  toneClass: string;
  label: string;
  meta: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        aria-hidden
      >
        <Icon className={cn("h-4 w-4", toneClass)} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-xs text-muted">{meta}</span>
      </span>
    </li>
  );
}
