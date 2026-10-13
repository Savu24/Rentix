"use client";

import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { FormField } from "@/components/ui/form-field";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { PLAN_LEASE_LIMIT } from "@/lib/billing/plans";
import { PLAN_LABELS, STATUS_LABELS } from "@/lib/validations/admin";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Sterowanie subskrypcją jednego konta.
 *
 * Cztery pola w jednym formularzu, a nie cztery osobne przełączniki: zmiany
 * chodzą parami („podnieś plan i wyczyść zaległość"), a osobne przyciski
 * znaczyłyby dwa żądania i stan pośredni widoczny dla klienta.
 *
 * Formularz wysyła komplet wartości, także niezmienionych. Co z tego naprawdę
 * jest zmianą, rozstrzyga serwer, porównując ze stanem w bazie — dzięki temu
 * do dziennika audytu nie trafia wpis „plan PRO → PRO" tylko dlatego, że ktoś
 * kliknął zapis dwa razy.
 */
export function SubscriptionForm({
  organizationId,
  organizationName,
  initial,
  used,
}: {
  organizationId: string;
  organizationName: string;
  initial: {
    plan: SubscriptionPlan;
    /** Próg zapisany na koncie. `null` = próg wynikający z planu. */
    leaseLimit: number | null;
    billingExempt: boolean;
    status: SubscriptionStatus;
  };
  /** Umowy poza archiwum — do ostrzeżenia przed obniżeniem progu. */
  used: number;
}) {
  const router = useRouter();

  const [plan, setPlan] = useState<SubscriptionPlan>(initial.plan);
  const [leaseLimit, setLeaseLimit] = useState(
    initial.leaseLimit === null ? "" : String(initial.leaseLimit),
  );
  const [billingExempt, setBillingExempt] = useState(initial.billingExempt);
  const [status, setStatus] = useState<SubscriptionStatus>(initial.status);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Próg, który konto naprawdę dostanie: wpisany wprost albo domyślny z planu.
  const effectiveLimit = leaseLimit.trim() === "" ? PLAN_LEASE_LIMIT[plan] : Number(leaseLimit);
  const willBeOverLimit =
    effectiveLimit !== null && Number.isFinite(effectiveLimit) && used > effectiveLimit;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await api.patch(`/api/admin/organizations/${organizationId}/subscription`, {
      plan,
      leaseLimit: leaseLimit.trim(),
      billingExempt,
      status,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(`Zapisano zmiany dla ${organizationName}.`);
    router.refresh();
  }

  return (
    <SectionCard
      title="Subskrypcja"
      icon={Wallet}
      actions={
        <InfoTip label="Jak działają pola subskrypcji" align="end">
          <span className="flex flex-col gap-1.5">
            <span>Limit umów: puste pole oznacza próg z planu. Tędy wchodzą konta sprzed cennika.</span>
            <span>Status: zaległość i anulowanie nie odbierają dziś dostępu, bramki chodzą po planie.</span>
            <span>Bez opłat: konto własne, demo albo partner. Korzysta z planu, nie trafia do rozliczenia.</span>
            <span>Każda zmiana trafia do dziennika.</span>
          </span>
        </InfoTip>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="plan" label="Plan">
            <Select id="plan" value={plan} onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}>
              {Object.entries(PLAN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                  {PLAN_LEASE_LIMIT[value as SubscriptionPlan] === null
                    ? " · bez limitu"
                    : ` · ${PLAN_LEASE_LIMIT[value as SubscriptionPlan]} umów`}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="leaseLimit" label="Limit umów (opcjonalnie)">
            <Input
              id="leaseLimit"
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              className="font-mono"
              value={leaseLimit}
              onChange={(event) => setLeaseLimit(event.target.value)}
              placeholder={PLAN_LEASE_LIMIT[plan] === null ? "bez limitu" : String(PLAN_LEASE_LIMIT[plan])}
            />
          </FormField>

          <FormField id="status" label="Status">
            <Select id="status" value={status} onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <label className="flex items-center gap-3 self-end pb-2.5 text-sm font-[550] text-fg">
            <Switch checked={billingExempt} onCheckedChange={setBillingExempt} label="Bez opłat" />
            Bez opłat
          </label>
        </div>

        {willBeOverLimit ? (
          <Alert tone="warning">
            Konto ma {used} umów, a po zapisie próg wyniesie {effectiveLimit}. Istniejące umowy zostaną
            nietknięte, panel po prostu nie pozwoli dołożyć kolejnej.
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
            Zapisz
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
