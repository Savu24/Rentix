import { Paperclip, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { MessageContent } from "@/components/panel/messages/message-content";
import { PageHeader } from "@/components/panel/page-header";
import { SectionCard } from "@/components/panel/section-card";
import { MessageStatusBadge } from "@/components/panel/status-badges";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatDateIn } from "@/lib/i18n/format";
import { getSentEmail } from "@/lib/messages/service";
import {
  DELIVERED_EVENTS,
  MESSAGE_STATUS_TONE,
  PROBLEM_EVENTS,
  resolveMessageStatus,
} from "@/lib/messages/status";
import { isEditableType } from "@/lib/notifications/types";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.messagesPage.title };
}

const DOT = {
  neutral: "bg-subtle",
  info: "bg-info",
  good: "bg-good",
  warning: "bg-warn",
  critical: "bg-bad",
} as const;

/**
 * Wysłany e-mail (redesign/17-wiadomosc-karta.svg): treść tak, jak ją
 * zobaczył najemca, obok metadane i oś zdarzeń z Resend.
 */
export default async function MessageDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.messagesPage;
  const session = await requireOwnerSession();
  const { id } = await params;

  const email = await getSentEmail(session.user.organizationId, id);
  if (!email) notFound();

  const status = resolveMessageStatus(email);
  const sentAt = email.sentAt ?? email.createdAt;
  const hint =
    status in t.detail.statusHints ? t.detail.statusHints[status as keyof typeof t.detail.statusHints] : null;
  const problem = email.status === "FAILED" || PROBLEM_EVENTS.includes(status);

  /*
    Oś zdarzeń: wysyłka z naszą godziną, a za nią — jeśli Resend wie coś
    więcej — ostatni stan dostawy. Resend nie podaje godziny tego stanu
    w odpowiedzi, więc nie zmyślamy jej.
  */
  const followUp =
    email.status === "SENT" &&
    (DELIVERED_EVENTS.includes(status) || PROBLEM_EVENTS.includes(status) || status === "delivery_delayed")
      ? status
      : null;

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/wiadomosci", label: t.title }}
        title={email.title}
        badges={<MessageStatusBadge status={status} d={d} />}
        meta={<span className="font-mono">{formatDateIn(sentAt, locale, "dateTime")}</span>}
        actions={
          isEditableType(email.type) ? (
            <Button asChild variant="secondary">
              <Link href="/panel/ustawienia/wiadomosci">
                <Pencil className="size-[18px]" aria-hidden />
                {t.detail.editTemplate}
              </Link>
            </Button>
          ) : null
        }
      />

      {hint ? (
        <Alert
          tone={problem ? "error" : "warning"}
          action={
            problem && email.tenant ? (
              <Link href={`/panel/najemcy/${email.tenant.id}/edytuj`} className="hover:underline">
                {t.detail.fixAddress}
              </Link>
            ) : undefined
          }
        >
          {hint}
        </Alert>
      ) : null}

      {email.error ? (
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface-alt px-5 py-4">
          <h2 className="text-[12.5px] font-[550] text-subtle">{t.detail.errorTitle}</h2>
          <p className="font-mono text-[13.5px] break-words text-fg">{email.error}</p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,700px)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-tile border border-border bg-surface px-4 pt-2 pb-4 lg:px-6 lg:pb-6">
          <MessageContent subject={email.title} html={email.html} text={email.body} />
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-tile border border-border bg-surface px-5 py-5 lg:px-6">
            <dl className="flex flex-col gap-4">
              <Field label={t.detail.from}>{email.fromAddress ?? "-"}</Field>
              <Field label={t.detail.to}>{email.toEmail ?? "-"}</Field>
              {email.replyTo ? <Field label={t.detail.replyTo}>{email.replyTo}</Field> : null}
              <Field label={t.detail.type}>{d.panel.tenantsPage.detail.notificationTypes[email.type]}</Field>
              {email.invoice ? (
                <Field label={t.detail.document}>
                  <Link
                    href={`/panel/finanse/${email.invoice.id}`}
                    className="font-mono font-[550] text-accent hover:underline"
                  >
                    {email.invoice.number}
                  </Link>
                </Field>
              ) : null}
              {email.tenant ? (
                <Field label={t.detail.tenant}>
                  <Link href={`/panel/najemcy/${email.tenant.id}`} className="font-[550] text-accent hover:underline">
                    {email.tenant.firstName} {email.tenant.lastName}
                  </Link>
                </Field>
              ) : null}
              {email.attachmentNames.length > 0 ? (
                <Field label={t.detail.attachments}>
                  <span className="flex flex-col gap-1">
                    {email.attachmentNames.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1.5">
                        <Paperclip className="size-3.5 shrink-0 text-subtle" aria-hidden />
                        <span className="break-all">{name}</span>
                      </span>
                    ))}
                  </span>
                </Field>
              ) : null}
              <Field label={t.detail.id}>
                <span className="font-mono text-xs break-all text-muted">{email.providerId ?? email.id}</span>
              </Field>
            </dl>
          </section>

          <SectionCard title={t.detail.events}>
            <ol className="flex flex-col">
              <TimelineStep
                dot={email.status === "FAILED" ? DOT.critical : DOT.good}
                label={email.status === "FAILED" ? t.detail.eventFailed : t.detail.eventSent}
                meta={formatDateIn(sentAt, locale, "dateTime")}
                last={!followUp}
              />
              {followUp ? (
                <TimelineStep
                  dot={DOT[MESSAGE_STATUS_TONE[followUp]]}
                  label={t.status[followUp]}
                  meta={t.detail.eventLatest}
                  last
                />
              ) : null}
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[12.5px] font-medium text-subtle">{label}</dt>
      <dd className="text-sm font-medium break-words text-fg">{children}</dd>
    </div>
  );
}

function TimelineStep({ dot, label, meta, last }: { dot: string; label: string; meta: string; last?: boolean }) {
  return (
    <li className={cn("relative flex gap-3.5", !last && "pb-4")}>
      {!last ? <span className="absolute top-5 bottom-0 left-[4.5px] w-px bg-border-strong" aria-hidden /> : null}
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-[550] text-fg">{label}</span>
        <span className="font-mono text-[13px] text-muted">{meta}</span>
      </span>
    </li>
  );
}
