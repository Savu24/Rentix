import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotificationForm } from "@/components/panel/settings/notification-form";
import { NotificationToggles } from "@/components/panel/settings/notification-toggles";
import { requireOwnerSession } from "@/lib/auth/session";
import { getNotificationPanelData } from "@/lib/notifications/service";

export const metadata: Metadata = { title: "Ustawienia powiadomień" };

export default async function SettingsNotificationsPage() {
  const session = await requireOwnerSession("/panel/ustawienia/powiadomienia");
  const data = await getNotificationPanelData(session.user.organizationId);

  if (!data) notFound();

  return (
    <div className="flex flex-col gap-5">
      <NotificationForm
        organizationName={data.organizationName}
        contactEmail={data.contactEmail}
        defaultValues={{
          senderName: data.senderName,
          reminderDaysBefore: data.reminderDaysBefore,
          overdueRepeatDays: data.overdueRepeatDays,
        }}
      />

      <NotificationToggles
        templates={data.templates.map(({ type, enabled }) => ({ type, enabled }))}
      />
    </div>
  );
}
