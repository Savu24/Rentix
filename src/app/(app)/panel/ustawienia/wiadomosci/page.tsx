import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanLock } from "@/components/panel/plan-lock";
import { TemplateEditor } from "@/components/panel/settings/template-editor";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
import { getNotificationPanelData } from "@/lib/notifications/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.settings.pages.messages };
}

export default async function SettingsMessagesPage() {
  const session = await requireOwnerSession("/panel/ustawienia/wiadomosci");
  const d = await panelDictionary();
  const t = d.panel.settings.pages;

  /*
    Edytor nie pojawia się w wersji „do obejrzenia": zapis i tak odbiłby się
    o bramkę w API, a formularz, który przyjmuje tekst i go nie zapisuje, jest
    gorszy niż jego brak. Rytm przypomnień i przełącznik automatycznej wysyłki
    zostają w zakładce obok i działają na każdym planie.
  */
  if (!(await organizationAllows(session.user.organizationId, "MESSAGE_TEMPLATES"))) {
    return (
      <PlanLock
        feature="MESSAGE_TEMPLATES"
        title={t.messagesLocked.title}
        lead={t.messagesLocked.lead}
      />
    );
  }

  const data = await getNotificationPanelData(session.user.organizationId);

  if (!data) notFound();

  const landlordName = data.senderName.trim() || data.organizationName;

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info">{t.messagesLead}</Alert>

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
