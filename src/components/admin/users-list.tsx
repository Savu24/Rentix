"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import type { AdminUserRow } from "@/lib/admin/users";
import { USER_ROLE_LABELS } from "@/lib/validations/admin";

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
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const isTenant = user.role === "TENANT";
        const busy = busyId === user.id;

        return (
          <Card key={user.id}>
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {user.name ?? user.email}
                  {isSelf ? <Badge tone="accent">to Ty</Badge> : null}
                  {user.emailVerified ? null : <Badge tone="warning">e-mail niepotwierdzony</Badge>}
                  {user.hasPassword ? null : <Badge>tylko Google</Badge>}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>

                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {user.organizations.length === 0 ? (
                    <span>bez organizacji</span>
                  ) : (
                    user.organizations.map((organization) => (
                      <Link
                        key={organization.id}
                        href={`/admin/organizacje/${organization.id}`}
                        className="hover:text-accent"
                      >
                        {organization.name}
                      </Link>
                    ))
                  )}
                  <span>
                    ·{" "}
                    {user.lastLoginAt
                      ? `ostatnio ${day.format(user.lastLoginAt)}`
                      : "nigdy nie zalogowany"}
                  </span>
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
                      run(
                        user.id,
                        { action: "VERIFY_EMAIL" },
                        `Adres ${user.email} oznaczony jako potwierdzony.`,
                      )
                    }
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <MailCheck className="h-4 w-4" aria-hidden />
                    )}
                    Potwierdź e-mail
                  </Button>
                )}

                {/*
                  Najemcy i własnemu kontu roli się nie zmienia — serwer i tak
                  by tego nie przyjął, a lista rozwijana kończąca się odmową
                  jest gorsza niż jej brak (patrz `runAdminUserAction`).
                */}
                {isSelf || isTenant ? (
                  <Badge tone={user.role === "ADMIN" ? "warning" : "neutral"}>
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
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
                          `${user.email}: rola zmieniona na ${
                            USER_ROLE_LABELS[event.target.value] ?? event.target.value
                          }.`,
                        )
                      }
                    >
                      <option value="OWNER">{USER_ROLE_LABELS.OWNER}</option>
                      <option value="ADMIN">{USER_ROLE_LABELS.ADMIN}</option>
                    </Select>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
