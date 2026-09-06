"use client";

import { Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { ASSIGNABLE_ROLES, membershipRoleLabels } from "@/lib/validations/team";
import type { PendingInvitation, TeamMember } from "@/lib/team/service";

/**
 * Lista zespołu i zaproszeń.
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

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.members.title}</h2>

          <ul className="flex flex-col">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const locked = member.role === "OWNER" || isSelf || !canManage;

              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                      {member.name ?? member.email}
                      {isSelf ? <Badge>{t.members.you}</Badge> : null}
                    </p>
                    <p className="truncate text-xs text-muted">{member.email}</p>
                    <p className="text-xs text-muted">
                      {member.lastLoginAt
                        ? fill(t.members.lastLogin, {
                            date: formatDateIn(member.lastLoginAt, locale, "short"),
                          })
                        : t.members.neverLoggedIn}
                    </p>
                  </div>

                  {locked ? (
                    <Badge tone={member.role === "OWNER" ? "accent" : "neutral"}>
                      {roleLabels[member.role]}
                    </Badge>
                  ) : (
                    <>
                      <label className="sr-only" htmlFor={`role-${member.id}`}>
                        {t.members.role}
                      </label>
                      <Select
                        id={`role-${member.id}`}
                        className="h-9 w-44 text-[13px]"
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

                      {confirming === member.id ? (
                        <div className="flex basis-full flex-col gap-2 sm:basis-auto">
                          <p className="text-xs text-muted">
                            {fill(t.members.removeConfirm, {
                              name: member.name ?? member.email,
                            })}
                          </p>
                          <div className="flex gap-2.5">
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busyId === member.id}
                              onClick={() => remove(member.id)}
                            >
                              {busyId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : null}
                              {t.members.remove}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === member.id}
                              onClick={() => setConfirming(null)}
                            >
                              {d.panel.common.cancel}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setConfirming(member.id)}
                        >
                          <X className="h-4 w-4" aria-hidden />
                          {t.members.remove}
                        </Button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.pending.title}</h2>

          {invitations.length === 0 ? (
            <p className="text-sm text-muted">{t.pending.empty}</p>
          ) : (
            <ul className="flex flex-col">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0"
                >
                  <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{invitation.email}</p>
                    <p className="text-xs text-muted">
                      {invitation.expired
                        ? t.pending.expired
                        : fill(t.pending.expires, {
                            date: formatDateIn(invitation.expiresAt, locale, "short"),
                          })}
                      {invitation.invitedBy
                        ? ` · ${fill(t.pending.invitedBy, { name: invitation.invitedBy })}`
                        : ""}
                    </p>
                  </div>

                  {invitation.role ? (
                    <Badge tone={invitation.expired ? "neutral" : "accent"}>
                      {roleLabels[invitation.role]}
                    </Badge>
                  ) : null}

                  {canManage ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === invitation.id}
                      onClick={() => cancelInvite(invitation.id)}
                    >
                      {busyId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      {t.pending.cancel}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage ? null : (
        <p className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {d.panel.api.teamManagerOnly}
        </p>
      )}
    </div>
  );
}
