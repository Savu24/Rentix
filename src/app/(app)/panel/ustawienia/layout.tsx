import type { Metadata } from "next";

import { SettingsTabs } from "@/components/panel/settings/settings-tabs";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.nav.settings };
}

/**
 * Wspólna rama zakładek ustawień.
 *
 * Nagłówek i pasek zakładek stoją tutaj, żeby przy przełączaniu sekcji nie
 * przerysowywały się razem z treścią — Next zachowuje layout między trasami,
 * więc zakładka nie mruga przy każdym kliknięciu.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">
          {(await panelDictionary()).panel.nav.settings}
        </h1>
        <p className="text-sm text-muted">
          {(await panelDictionary()).panel.panelMisc.settingsLead}
        </p>
      </div>

      <SettingsTabs />

      {children}
    </div>
  );
}
