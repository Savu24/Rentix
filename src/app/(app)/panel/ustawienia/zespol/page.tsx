import type { Metadata } from "next";

import { PlanLock } from "@/components/panel/plan-lock";
import { TeamInviteForm } from "@/components/panel/settings/team-invite-form";
import { TeamMembers } from "@/components/panel/settings/team-members";
import { membershipRole, requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
import { panelDictionary } from "@/lib/panel/dictionary";
import { getTeam } from "@/lib/team/service";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.team.title };
}

/**
 * Zespół — kto ma dostęp do konta organizacji.
 *
 * Formularz zaproszenia widzi tylko właściciel i administrator; pozostali
 * oglądają skład bez przycisków. Listę pokazujemy wszystkim w organizacji
 * celowo: „kto jeszcze tu wchodzi" to informacja, która należy się każdemu,
 * kto pracuje na tych danych.
 */
export default async function TeamSettingsPage() {
  const session = await requireOwnerSession("/panel/ustawienia/zespol");
  const organizationId = session.user.organizationId;

  const d = await panelDictionary();
  const t = d.panel.team;

  if (!(await organizationAllows(organizationId, "TEAM"))) {
    return <PlanLock feature="TEAM" title={t.locked.title} lead={t.locked.lead} />;
  }

  const [team, role] = await Promise.all([
    getTeam(organizationId),
    membershipRole(session.user.id, organizationId),
  ]);

  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">{t.lead}</p>

      {canManage ? <TeamInviteForm /> : null}

      <TeamMembers
        members={team.members}
        invitations={team.invitations}
        currentUserId={session.user.id}
        canManage={canManage}
      />
    </div>
  );
}
