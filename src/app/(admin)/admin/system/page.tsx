import type { Metadata } from "next";

import { AlertTriangle, CheckCircle2, CircleSlash, Plug, TriangleAlert } from "lucide-react";

import { StatPlate } from "@/components/admin/stat-tile";
import { PageHeader } from "@/components/panel/page-header";
import { SectionCard } from "@/components/panel/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { integrations, lastBillingRun, notificationQueue } from "@/lib/admin/health";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "System" };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const STATE_TONE = {
  on: "good",
  partial: "warning",
  off: "neutral",
} as const;

const STATE_ICON = {
  on: CheckCircle2,
  partial: AlertTriangle,
  off: CircleSlash,
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            System
            <InfoTip label="Co pokazuje ta strona">
              Co jest podpięte i czy procesy w tle chodzą. Panel pokazuje wyłącznie, czy zmienna środowiskowa
              jest ustawiona, nigdy jej wartości.
            </InfoTip>
          </span>
        }
      />

      <SectionCard title="Integracje" icon={Plug} bodyClassName="pt-1">
        <ul className="flex flex-col divide-y divide-border">
          {services.map((service) => (
            <li key={service.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-fg">{service.name}</span>
                <span className="text-[13px] text-muted">{service.detail}</span>
              </div>
              <Badge tone={STATE_TONE[service.state]} icon={STATE_ICON[service.state]}>
                {STATE_LABEL[service.state]}
              </Badge>
            </li>
          ))}
        </ul>
      </SectionCard>

      <StatPlate
        stats={[
          { label: "Powiadomienia czekające", value: String(queue.pending), hint: "status PENDING, nie wyszły jeszcze" },
          { label: "Nieudane", value: String(queue.failed), hint: "odbite przez bramkę e-mail" },
          { label: "Wysłane (7 dni)", value: String(queue.sentLast7Days) },
          {
            label: "Faktury (24 h)",
            value: String(billing.invoicesLast24h),
            hint: billing.lastInvoiceAt ? `ostatnia ${stamp.format(billing.lastInvoiceAt)}` : "nic jeszcze nie wystawiono",
          },
        ]}
      />

      {stuck ? (
        <Alert tone="warning">
          W kolejce stoi {queue.pending} powiadomień. Jeśli liczba nie spada, sprawdź konfigurację wysyłki e-mail
          i to, czy scheduler wywołuje <code>/api/cron/billing</code>.
        </Alert>
      ) : null}

      <SectionCard
        title="Ostatnie błędy wysyłki"
        icon={TriangleAlert}
        actions={
          <span className="text-[13px] text-muted">
            {queue.lastSentAt ? `ostatnia udana wysyłka: ${stamp.format(queue.lastSentAt)}` : "brak udanych wysyłek"}
          </span>
        }
        bodyClassName="pt-1"
      >
        {queue.recentFailures.length === 0 ? (
          <p className="py-2 text-sm text-muted">Żadne powiadomienie się nie odbiło.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {queue.recentFailures.map((failure) => (
              <li key={failure.id} className="flex flex-col gap-0.5 py-3">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-semibold text-fg">
                  {failure.toEmail ?? "brak adresu"}
                  <span className="font-mono text-[13px] font-normal text-muted">{stamp.format(failure.createdAt)}</span>
                </p>
                <p className="text-[13px] text-bad">{failure.error ?? "bez treści błędu"}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
