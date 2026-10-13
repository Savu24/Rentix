"use client";

import { AlertCircle, Clock, FileText, Loader2, Zap, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { SectionCard } from "@/components/panel/section-card";
import { InfoTip } from "@/components/ui/info-tip";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import type { EditableNotificationType } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<EditableNotificationType, LucideIcon> = {
  INVOICE_ISSUED: FileText,
  PAYMENT_REMINDER: Clock,
  PAYMENT_OVERDUE: AlertCircle,
};

/**
 * Które powiadomienia wychodzą automatycznie.
 *
 * Każdy przełącznik zapisuje się od razu, bez wspólnego „Zapisz". Przy
 * pojedynczym przestawieniu przycisk zapisu jest tylko dodatkowym kliknięciem,
 * a zapomniany zostawia ustawienie, które wygląda na zmienione i nie jest.
 */
export function NotificationToggles({
  templates,
}: {
  templates: Array<{ type: EditableNotificationType; enabled: boolean }>;
}) {
  const { d } = useI18n();
  const t = d.panel.settings.notifications;
  const types = t.types;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState<EditableNotificationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Stan lokalny wyprzedza serwer — przełącznik ma odpowiadać pod palcem. */
  const [state, setState] = useState(() =>
    Object.fromEntries(templates.map((template) => [template.type, template.enabled])),
  );

  async function toggle(type: EditableNotificationType, next: boolean) {
    setError(null);
    setSaving(type);
    setState((current) => ({ ...current, [type]: next }));

    const result = await api.patch("/api/notifications/templates", { type, enabled: next });
    setSaving(null);

    if (!result.ok) {
      // Cofamy przełącznik: zostawiony w nowej pozycji kłamałby o stanie serwera.
      setState((current) => ({ ...current, [type]: !next }));
      setError(result.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <SectionCard
      title={t.togglesTitle}
      icon={Zap}
      actions={
        <InfoTip label={t.togglesInfo} align="end">
          {t.togglesLead}
        </InfoTip>
      }
      bodyClassName="pt-1"
    >
      {error ? <Alert tone="error">{error}</Alert> : null}

      <ul className="flex flex-col divide-y divide-border">
        {templates.map((template) => {
          const on = state[template.type] ?? true;
          const Icon = TYPE_ICON[template.type];
          const label = types[template.type].label;

          return (
            <li key={template.type} className="flex min-h-16 items-center gap-4 py-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-alert",
                  on ? "bg-accent-soft text-accent" : "bg-surface-alt text-subtle",
                )}
                aria-hidden
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-[550] text-fg">{label}</span>
              {saving === template.type || pending ? (
                <Loader2 className="size-4 animate-spin text-subtle" aria-hidden />
              ) : null}
              <Switch
                checked={on}
                disabled={saving !== null}
                onCheckedChange={(next) => void toggle(template.type, next)}
                label={fill(t.autoSend, { type: label })}
              />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
