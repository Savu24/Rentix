import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminFilters } from "@/components/admin/admin-filters";
import { UsersList } from "@/components/admin/users-list";
import { PageHeader } from "@/components/panel/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader title="Użytkownicy" />

      <Suspense fallback={null}>
      <AdminFilters
        placeholder="E-mail albo imię i nazwisko"
        total={users.length}
        totalLabel={users.length === 1 ? "konto" : "kont"}
        segmented={{
          key: "role",
          label: "Rola",
          allLabel: "Wszyscy",
          options: [
            { value: "OWNER", label: USER_ROLE_LABELS.OWNER! },
            { value: "ADMIN", label: USER_ROLE_LABELS.ADMIN! },
            { value: "TENANT", label: USER_ROLE_LABELS.TENANT! },
          ],
        }}
      />
      </Suspense>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nic nie pasuje" />
      ) : (
        <UsersList users={users} currentUserId={session.user.id} />
      )}
    </div>
  );
}
