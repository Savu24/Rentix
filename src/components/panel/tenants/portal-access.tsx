"use client";

import { Globe, Loader2, RefreshCw, Send, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";

/**
 * Dostęp najemcy do portalu: zaproszenie, ponowienie, odebranie.
 *
 * Konto zakłada sobie najemca sam, klikając w link — my go nie tworzymy z
 * wpisanym hasłem. Hasło ustalone przez wynajmującego trzeba by najemcy
 * przekazać kanałem, którego nie kontrolujemy, i zostałoby znane dwóm osobom.
 */
export function TenantPortalAccess({
  tenantId,
  email,
  hasAccount,
  pending,
}: {
  tenantId: string;
  /** Adres z kartoteki. Pusty = nie ma dokąd wysłać zaproszenia. */
  email: string | null;
  hasAccount: boolean;
  pending: { email: string; expiresAt: string } | null;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.tenantPortalAccess;
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function invite() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = await api.post<{ email: string; sent: boolean; sendError: string | null }>(
      `/api/tenants/${tenantId}/portal`,
      {},
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(
      result.data.sent
        ? { tone: "success", text: fill(t.sent, { email: result.data.email }) }
        : { tone: "warning", text: fill(t.notDelivered, { error: result.data.sendError ?? "" }) },
    );

    router.refresh();
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = await api.delete(`/api/tenants/${tenantId}/portal`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(false);
    setNotice({ tone: "success", text: t.revoked });
    router.refresh();
  }

  const status = hasAccount
    ? t.hasAccount
    : pending
      ? fill(t.pending, {
          email: pending.email,
          date: formatDateIn(new Date(pending.expiresAt), locale, "short"),
        })
      : t.noAccount;

  return (
    <SectionCard
      title={t.title}
      icon={Globe}
      actions={
        hasAccount ? (
          <Badge tone="good" icon={UserCheck} size="sm">
            {t.hasAccount}
          </Badge>
        ) : pending ? (
          <Badge tone="info" icon={Send} size="sm">
            {t.pendingBadge}
          </Badge>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

        {hasAccount ? null : <p className="text-[13.5px] text-muted">{status}</p>}

        {/* Bez adresu nie ma dokąd wysłać zaproszenia — wyłączony przycisk
            bez powodu wyglądałby na błąd. */}
        {!hasAccount && !email ? (
          <p className="text-[13px] text-subtle">{t.noEmailHint}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {hasAccount ? (
            confirming ? (
              <>
                <p className="basis-full text-[13px] text-muted">{t.revokeConfirm}</p>
                <Button size="sm" variant="danger" disabled={busy} onClick={revoke}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {t.revoke}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  {d.panel.common.cancel}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                <X className="size-4" aria-hidden />
                {t.revoke}
              </Button>
            )
          ) : (
            <Button size="sm" variant="secondary" disabled={busy || !email} onClick={invite}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : pending ? (
                <RefreshCw className="size-4" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {busy ? t.sending : pending ? t.resend : t.invite}
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
