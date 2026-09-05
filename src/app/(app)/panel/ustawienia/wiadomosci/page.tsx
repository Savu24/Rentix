import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateEditor } from "@/components/panel/settings/template-editor";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { getNotificationPanelData } from "@/lib/notifications/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.settings.pages.messages };
}

export default async function SettingsMessagesPage() {
  const session = await requireOwnerSession("/panel/ustawienia/wiadomosci");
  const data = await getNotificationPanelData(session.user.organizationId);

  if (!data) notFound();

  const landlordName = data.senderName.trim() || data.organizationName;

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info">
        {(await panelDictionary()).panel.settings.pages.messagesLead}
      </Alert>

      {data.templates.map((template) => (
        <TemplateEditor
          key={template.type}
          type={template.type}
          landlordName={landlordName}
          defaultValues={{
            subject: template.subject,
            heading: template.heading,
            intro: template.intro,
            outro: template.outro,
          }}
        />
      ))}
    </div>
  );
}
