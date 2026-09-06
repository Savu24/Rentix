import { Users } from "lucide-react";
import type { Metadata } from "next";

import { AdminFilters } from "@/components/admin/admin-filters";
import { UsersList } from "@/components/admin/users-list";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminSession } from "@/lib/admin/session";
import { listAdminUsers } from "@/lib/admin/users";
import { USER_ROLE_LABELS, userSearchSchema } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Użytkownicy" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session } = await requireAdminSession("/admin/uzytkownicy");

  const params = await searchParams;
  const parsed = userSearchSchema.safeParse(params);
  const search = parsed.success ? parsed.data : userSearchSchema.parse({});

  const users = await listAdminUsers(search);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">Użytkownicy</h1>
        <p className="text-sm text-muted">
          Wszystkie konta platformy. Stąd nadaje się uprawnienia administratora i odblokowuje
          konto, do którego nie dotarła wiadomość aktywacyjna — dane konta zmienia jego właściciel.
        </p>
      </div>

      <AdminFilters
        placeholder="E-mail albo imię i nazwisko"
        total={users.length}
        totalLabel={users.length === 1 ? "konto" : "kont"}
        selects={[
          {
            key: "role",
            label: "Rola",
            allLabel: "Każda rola",
            options: [
              { value: "OWNER", label: USER_ROLE_LABELS.OWNER! },
              { value: "ADMIN", label: USER_ROLE_LABELS.ADMIN! },
              { value: "TENANT", label: USER_ROLE_LABELS.TENANT! },
            ],
          },
        ]}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nic nie pasuje"
          description="Żadne konto nie odpowiada tym filtrom."
        />
      ) : (
        <UsersList users={users} currentUserId={session.user.id} />
      )}
    </div>
  );
}
