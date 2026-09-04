"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import {
  NOTIFICATION_TYPE_HINTS,
  NOTIFICATION_TYPE_LABELS,
  type EditableNotificationType,
} from "@/lib/notifications/types";

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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">Co wychodzi automatycznie</h2>
          <p className="mt-0.5 text-sm text-muted">
            Wyłączone powiadomienie nie pójdzie nocnym przebiegiem. Ręcznej wysyłki dokumentu
            z listy rachunków nie blokuje. To osobne, świadome kliknięcie.
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <ul className="flex flex-col divide-y divide-border">
          {templates.map((template) => (
            <li key={template.type} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">
                  {NOTIFICATION_TYPE_LABELS[template.type]}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {NOTIFICATION_TYPE_HINTS[template.type]}
                </p>
              </div>

              <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
                {saving === template.type || pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={state[template.type] ?? true}
                  disabled={saving !== null}
                  onChange={(event) => toggle(template.type, event.target.checked)}
                />
                <span className="sr-only">
                  Wysyłaj automatycznie: {NOTIFICATION_TYPE_LABELS[template.type]}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
