"use client";

import { Loader2, Mail, Send, ShieldCheck, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SectionCard } from "@/components/panel/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { ASSIGNABLE_ROLES, membershipRoleLabels } from "@/lib/validations/team";
import type { PendingInvitation, TeamMember } from "@/lib/team/service";
import { cn, initials } from "@/lib/utils";

/**
 * Lista zespołu i zaproszeń (redesign/19-ustawienia-zespol.svg).
 *
 * Jeden komponent kliencki na obie listy, mimo że są to dwie sekcje: operacje
 * na nich dzielą stan zajętości i miejsce na komunikat błędu, a rozbicie na
 * dwa komponenty znaczyłoby dwa niezależne paski błędów potrafiące pokazać
 * sprzeczne rzeczy naraz.
 *
 * Wiersz właściciela konta nie ma ani listy ról, ani przycisku usunięcia —
 * serwer i tak by ich nie przyjął (patrz `ASSIGNABLE_ROLES`), a przycisk
 * kończący się odmową jest gorszy niż jego brak.
 */
export function TeamMembers({
  members,
  invitations,
  currentUserId,
  /** Czy zalogowany może w ogóle zmieniać skład — OWNER albo ADMIN. */
  canManage,
}: {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  canManage: boolean;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.team;
  const router = useRouter();
  const roleLabels = membershipRoleLabels(d);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function run(id: string, request: () => Promise<{ ok: boolean; message?: string }>) {
    setBusyId(id);
    setError(null);
    setNotice(null);

    const result = await request();
    setBusyId(null);

    if (!result.ok) {
      setError(result.message ?? null);
      return;
    }

    setConfirming(null);
    router.refresh();
  }

  const changeRole = (id: string, role: string) =>
    run(id, async () => {
      const result = await api.patch(`/api/team/members/${id}`, { role });
      if (result.ok) setNotice(t.members.roleSaved);
      return result;
    });

  const remove = (id: string) => run(id, () => api.delete(`/api/team/members/${id}`));

  const cancelInvite = (id: string) => run(id, () => api.delete(`/api/team/invitations/${id}`));

  const removing = members.find((member) => member.id === confirming) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <SectionCard title={t.members.title} icon={Users} bodyClassName="pt-1">
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const locked = member.role === "OWNER" || isSelf || !canManage;
            const name = member.name ?? member.email;

            return (
              <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                    isSelf ? "bg-highlight-soft text-warn-ink" : "bg-accent-soft text-accent",
                  )}
                  aria-hidden
                >
                  {initials(name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-fg">
                    {name}
                    {isSelf ? <Badge size="sm">{t.members.you}</Badge> : null}
                  </p>
                  <p className="text-[13px] [overflow-wrap:anywhere] text-muted">{member.email}</p>
                </div>

                <span className="text-[13px] text-subtle sm:w-40">
                  {member.lastLoginAt ? (
                    fill(t.members.lastLogin, { date: formatDateIn(member.lastLoginAt, locale, "short") })
                  ) : (
                    <Badge size="sm">{t.members.neverLoggedIn}</Badge>
                  )}
                </span>

                {locked ? (
                  <span className="text-sm font-[550] text-muted sm:w-[13.5rem] sm:text-right">
                    {roleLabels[member.role]}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      {t.members.role}
                    </label>
                    <Select
                      id={`role-${member.id}`}
                      className="w-44"
                      value={member.role}
                      disabled={busyId === member.id}
                      onChange={(event) => changeRole(member.id, event.target.value)}
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-bad"
                      aria-label={`${t.members.remove}: ${name}`}
                      onClick={() => setConfirming(member.id)}
                    >
                      <Trash2 className="size-[18px]" aria-hidden />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard title={t.pending.title} icon={Send} bodyClassName="pt-1">
        {invitations.length === 0 ? (
          <p className="py-2 text-sm text-muted">{t.pending.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                <Mail className="size-[18px] shrink-0 text-subtle" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-[550] text-fg">{invitation.email}</p>
                  {invitation.invitedBy ? (
                    <p className="text-[12.5px] text-muted">
                      {fill(t.pending.invitedBy, { name: invitation.invitedBy })}
                    </p>
                  ) : null}
                </div>
                {invitation.role ? <Badge>{roleLabels[invitation.role]}</Badge> : null}
                <span className={cn("text-[13px]", invitation.expired ? "text-bad" : "text-muted")}>
                  {invitation.expired
                    ? t.pending.expired
                    : fill(t.pending.expires, { date: formatDateIn(invitation.expiresAt, locale, "short") })}
                </span>
                {canManage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === invitation.id}
                    onClick={() => cancelInvite(invitation.id)}
                  >
                    {busyId === invitation.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {t.pending.cancel}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {canManage ? null : (
        <p className="flex items-center gap-2 text-[12.5px] text-muted">
          <ShieldCheck className="size-3.5" aria-hidden />
          {d.panel.api.teamManagerOnly}
        </p>
      )}

      <Dialog
        open={removing !== null}
        onClose={() => setConfirming(null)}
        title={t.members.removeTitle}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[460px]"
      >
        <DialogBody>
          <p className="text-sm text-muted">
            {removing ? fill(t.members.removeConfirm, { name: removing.name ?? removing.email }) : null}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busyId !== null}>
            {d.panel.common.cancel}
          </Button>
          <Button variant="danger" onClick={() => removing && remove(removing.id)} disabled={busyId !== null}>
            {busyId ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-[18px]" aria-hidden />
            )}
            {t.members.remove}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
