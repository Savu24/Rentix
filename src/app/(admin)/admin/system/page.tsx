import type { Metadata } from "next";

import { StatTile } from "@/components/admin/stat-tile";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { integrations, lastBillingRun, notificationQueue } from "@/lib/admin/health";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "System" };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const STATE_TONE = {
  on: "good",
  partial: "warning",
  off: "neutral",
} as const;

const STATE_LABEL = {
  on: "Działa",
  partial: "Niepełna",
  off: "Wyłączona",
} as const;

export default async function AdminSystemPage() {
  await requireAdminSession("/admin/system");

  const [queue, billing] = await Promise.all([notificationQueue(), lastBillingRun()]);
  const services = integrations();

  /*
    Cisza w kolejce jest podejrzana dopiero wtedy, gdy jest co wysyłać.
    Konto bez najemców nie generuje powiadomień i brak wysyłki nie znaczy
    tam awarii — ostrzegamy więc o czekających, a nie o samym milczeniu.
  */
  const stuck = queue.pending > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">System</h1>
        <p className="text-sm text-muted">
          Co jest podpięte i czy procesy w tle chodzą. Panel pokazuje wyłącznie, czy zmienna
          środowiskowa jest ustawiona — nigdy jej wartości.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Integracje</h2>

          <ul className="flex flex-col">
            {services.map((service) => (
              <li
                key={service.name}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{service.name}</p>
                  <p className="text-xs text-muted">{service.detail}</p>
                </div>
                <Badge tone={STATE_TONE[service.state]}>{STATE_LABEL[service.state]}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Powiadomienia czekające"
          value={queue.pending}
          hint="Status PENDING — nie wyszły jeszcze"
        />
        <StatTile label="Nieudane" value={queue.failed} hint="Odbite przez bramkę e-mail" />
        <StatTile label="Wysłane (7 dni)" value={queue.sentLast7Days} />
        <StatTile
          label="Faktury (24 h)"
          value={billing.invoicesLast24h}
          hint={
            billing.lastInvoiceAt
              ? `ostatnia ${stamp.format(billing.lastInvoiceAt)}`
              : "nic jeszcze nie wystawiono"
          }
        />
      </div>

      {stuck ? (
        <Alert tone="warning">
          W kolejce stoi {queue.pending} powiadomień. Jeśli liczba nie spada, sprawdź konfigurację
          wysyłki e-mail i to, czy scheduler wywołuje <code>/api/cron/billing</code>.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Ostatnie błędy wysyłki</h2>
            <span className="text-xs text-muted">
              {queue.lastSentAt
                ? `ostatnia udana wysyłka: ${stamp.format(queue.lastSentAt)}`
                : "brak udanych wysyłek"}
            </span>
          </div>

          {queue.recentFailures.length === 0 ? (
            <p className="text-sm text-muted">Żadne powiadomienie się nie odbiło.</p>
          ) : (
            <ul className="flex flex-col">
              {queue.recentFailures.map((failure) => (
                <li
                  key={failure.id}
                  className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0"
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-fg">
                    {failure.toEmail ?? "brak adresu"}
                    <span className="text-xs text-muted">{stamp.format(failure.createdAt)}</span>
                  </p>
                  <p className="text-xs text-bad">{failure.error ?? "bez treści błędu"}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
