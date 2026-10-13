import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { SettingsTabs } from "@/components/panel/settings/settings-tabs";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.nav.settings };
}

/**
 * Wspólna rama zakładek ustawień (redesign/19-ustawienia-*.svg).
 *
 * Nagłówek i pasek zakładek stoją tutaj, żeby przy przełączaniu sekcji nie
 * przerysowywały się razem z treścią — Next zachowuje layout między trasami,
 * więc zakładka nie mruga przy każdym kliknięciu.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const d = await panelDictionary();

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader title={d.panel.nav.settings} />
        <SettingsTabs />
      </div>

      {children}
    </div>
  );
}

