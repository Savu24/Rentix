"use client";

import { AlertTriangle, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import type { AdminUserRow } from "@/lib/admin/users";
import { USER_ROLE_LABELS } from "@/lib/validations/admin";
import { initials } from "@/lib/utils";

/**
 * Lista kont platformy razem z operacjami.
 *
 * Jeden komponent kliencki na całą listę, tak jak w zespole organizacji:
 * wiersze dzielą stan zajętości i jedno miejsce na komunikat, a rozbicie na
 * komponent per wiersz dawałoby kilka pasków błędu potrafiących pokazać
 * sprzeczne rzeczy naraz.
 */
export function UsersList({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  /** Konto zalogowanego — własnej roli nie zmienia się z panelu. */
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

  async function run(id: string, body: unknown, success: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);

    const result = await api.patch(`/api/admin/users/${id}`, body);
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(success);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isTenant = user.role === "TENANT";
          const busy = busyId === user.id;
          const name = user.name ?? user.email;

          return (
            <li key={user.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 lg:px-6">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent"
                aria-hidden
              >
                {initials(name)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                  {name}
                  {isSelf ? <Badge size="sm">Ty</Badge> : null}
                  {user.emailVerified ? null : (
                    <Badge tone="warning" size="sm" icon={AlertTriangle}>
                      e-mail niepotwierdzony
                    </Badge>
                  )}
                  {user.hasPassword ? null : <Badge size="sm">tylko Google</Badge>}
                </p>
                <p className="text-[13px] [overflow-wrap:anywhere] text-muted">{user.email}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-subtle">
                  {user.organizations.length === 0 ? (
                    <span>bez organizacji</span>
                  ) : (
                    user.organizations.map((organization) => (
                      <Link
                        key={organization.id}
                        href={`/admin/organizacje/${organization.id}`}
                        className="font-[550] text-accent hover:underline"
                      >
                        {organization.name}
                      </Link>
                    ))
                  )}
                  <span>· {user.lastLoginAt ? `ostatnio ${day.format(user.lastLoginAt)}` : "nigdy nie zalogowany"}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {user.emailVerified ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      run(user.id, { action: "VERIFY_EMAIL" }, `Adres ${user.email} oznaczony jako potwierdzony.`)
                    }
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MailCheck className="size-4" aria-hidden />}
                    Potwierdź e-mail
                  </Button>
                )}

                {/*
                  Najemcy i własnemu kontu roli się nie zmienia — serwer i tak
                  by tego nie przyjął, a lista rozwijana kończąca się odmową
                  jest gorsza niż jej brak (patrz `runAdminUserAction`).
                */}
                {isSelf || isTenant ? (
                  <span className="w-44 text-right text-sm font-[550] text-muted">{USER_ROLE_LABELS[user.role]}</span>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`role-${user.id}`}>
                      Rola konta {user.email}
                    </label>
                    <Select
                      id={`role-${user.id}`}
                      value={user.role}
                      disabled={busy}
                      className="w-44"
                      onChange={(event) =>
                        run(
                          user.id,
                          { action: "SET_ROLE", role: event.target.value },
                          `${user.email}: rola zmieniona na ${USER_ROLE_LABELS[event.target.value] ?? event.target.value}.`,
                        )
                      }
                    >
                      <option value="OWNER">{USER_ROLE_LABELS.OWNER}</option>
                      <option value="ADMIN">{USER_ROLE_LABELS.ADMIN}</option>
                    </Select>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
