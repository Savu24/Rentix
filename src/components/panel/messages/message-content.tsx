"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

type View = "preview" | "text" | "html";

/**
 * Treść wysłanej wiadomości w trzech widokach, jak w Resend: tak, jak
 * zobaczył ją najemca, wersja tekstowa i surowy HTML.
 */
export function MessageContent({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string | null;
  text: string;
}) {
  const { d } = useI18n();
  const t = d.panel.messagesPage.detail;
  const views: View[] = html ? ["preview", "text", "html"] : ["text"];
  const [view, setView] = useState<View>(views[0]!);

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={t.tabsAria} className="flex gap-1 border-b border-border">
        {views.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              view === option
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.tabs[option]}
          </button>
        ))}
      </div>

      {!html ? <Alert tone="info">{t.noHtml}</Alert> : null}

      {view === "preview" && html ? (
        /*
          Wiadomość niesie własne <body> i style; wpuszczona wprost w panel
          dziedziczyłaby jego czcionki i tła. `sandbox` bez uprawnień wyłącza
          skrypty i nawigację — to treść, która wyszła poza system.
        */
        <iframe
          title={fill(t.previewFrameTitle, { subject })}
          sandbox=""
          srcDoc={html}
          className="h-[640px] w-full rounded-card border border-border bg-white"
        />
      ) : null}

      {view === "text" ? (
        <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-surface p-4 font-sans text-sm leading-relaxed text-fg">
          {text}
        </pre>
      ) : null}

      {view === "html" && html ? (
        <pre className="max-h-[640px] overflow-auto rounded-card border border-border bg-surface-alt p-4 font-mono text-xs leading-relaxed text-fg">
          {html}
        </pre>
      ) : null}
    </div>
  );
}
