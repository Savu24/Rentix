"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    <Card>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Subskrypcja</h2>

          {error ? <Alert tone="error">{error}</Alert> : null}
          {notice ? <Alert tone="success">{notice}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="plan" label="Plan">
              <Select
                id="plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
              >
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

            <FormField
              id="status"
              label="Status"
              hint="Zaległość i anulowanie nie odbierają dziś dostępu — bramki chodzą po planie."
            >
              <Select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="leaseLimit"
              label="Limit umów"
              hint="Puste pole = próg z planu. Tędy wchodzą konta sprzed cennika."
            >
              <Input
                id="leaseLimit"
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                value={leaseLimit}
                onChange={(event) => setLeaseLimit(event.target.value)}
                placeholder={
                  PLAN_LEASE_LIMIT[plan] === null ? "bez limitu" : String(PLAN_LEASE_LIMIT[plan])
                }
              />
            </FormField>

            <div className="flex items-end pb-1">
              <CheckboxField
                label="Zwolnione z opłat"
                hint="Konto własne, demo albo partner. Korzysta z planu, nie trafia do rozliczenia."
                checked={billingExempt}
                onChange={(event) => setBillingExempt(event.target.checked)}
              />
            </div>
          </div>

          {willBeOverLimit ? (
            <Alert tone="warning">
              Konto ma {used} umów, a po zapisie próg wyniesie {effectiveLimit}. Istniejące umowy
              zostaną nietknięte — panel po prostu nie pozwoli dołożyć kolejnej.
            </Alert>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz
            </Button>
            <span className="text-xs text-muted">Każda zmiana trafia do dziennika.</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
