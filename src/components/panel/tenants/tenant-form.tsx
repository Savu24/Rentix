"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import {
  invoiceKindLabels,
  selectableTenantDocumentKinds,
} from "@/lib/validations/invoice";
import {
  tenantDocumentKindHints,
  tenantLegalFormLabels,
  tenantStatusLabels,
  tenantFormSchema,
  type TenantFormInput,
  type TenantFormOutput,
} from "@/lib/validations/tenant";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
const EMPTY: TenantFormInput = {
  firstName: "",
  lastName: "",
  status: "PROSPECT",
  email: "",
  phone: "",
  street: "",
  postalCode: "",
  city: "",
  taxId: "",
  documentKind: "BILL",
  legalForm: "INDIVIDUAL",
  dateOfBirth: "",
  idCardNumber: "",
  pesel: "",
  passportNumber: "",
  residenceCardNumber: "",
  emergencyContactFirstName: "",
  emergencyContactLastName: "",
  emergencyContactPhone: "",
  emergencyContactEmail: "",
  registeredStreet: "",
  registeredPostalCode: "",
  registeredCity: "",
  registeredUntil: "",
  billingEmail: "",
  billingPhone: "",
  depositRefundAccount: "",
  employerName: "",
  employmentUntil: "",
  insurerName: "",
  insurancePolicyNumber: "",
  insuranceExpiresAt: "",
  notes: "",
};

export function TenantForm({
  tenantId,
  defaultValues,
}: {
  tenantId?: string;
  defaultValues?: Partial<TenantFormInput>;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.tenantsPage.form;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(tenantId);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormInput, unknown, TenantFormOutput>({
    resolver: zodResolver(tenantFormSchema(v)),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const documentKind = watch("documentKind");

  const registered = watch(["registeredStreet", "registeredPostalCode", "registeredCity"]);
  const hasRegisteredAddress = registered.some((value) => (value ?? "").trim() !== "");

  /**
   * Przepisanie adresu zameldowania do danych nabywcy.
   *
   * U większości najemców to ten sam adres, a wpisywany drugi raz z pamięci
   * potrafi się różnić literówką — i wtedy faktura idzie na adres, którego
   * nie ma. Przycisk zamiast automatu, bo bywa inaczej: firma z siedzibą pod
   * innym adresem albo najemca, który chce faktury na adres rodziców.
   */
  function copyRegisteredAddress() {
    const values = getValues();
    const fields = [
      ["street", values.registeredStreet],
      ["postalCode", values.registeredPostalCode],
      ["city", values.registeredCity],
    ] as const;

    for (const [target, value] of fields) {
      setValue(target, value ?? "", { shouldValidate: true, shouldDirty: true });
    }
  }

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);
    const values = getValues();

    const result = isEdit
      ? await api.patch<{ id: string }>(`/api/tenants/${tenantId}`, values)
      : await api.post<{ id: string }>("/api/tenants", values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field in EMPTY && messages[0]) {
          setError(field as keyof TenantFormInput, { message: messages[0] });
        }
      }
      setFormError(result.message);
      return;
    }

    router.push(`/panel/najemcy/${isEdit ? tenantId : result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{t.sectionBasics}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label={t.firstName} error={errors.firstName?.message}>
              <Input
                {...fieldAria("firstName", {
                  error: errors.firstName?.message,
                })}
                autoComplete="given-name"
                disabled={isSubmitting}
                {...register("firstName")}
              />
            </FormField>

            <FormField id="lastName" label={t.lastName} error={errors.lastName?.message}>
              <Input
                {...fieldAria("lastName", { error: errors.lastName?.message })}
                autoComplete="family-name"
                disabled={isSubmitting}
                {...register("lastName")}
              />
            </FormField>

            <FormField
              id="email"
              label={t.email}
              error={errors.email?.message}
              hint={t.emailHint}
            >
              <Input
                {...fieldAria("email", { error: errors.email?.message })}
                type="email"
                autoComplete="email"
                disabled={isSubmitting}
                {...register("email")}
              />
            </FormField>

            <FormField id="phone" label={t.phone} error={errors.phone?.message}>
              <Input
                {...fieldAria("phone", { error: errors.phone?.message })}
                type="tel"
                autoComplete="tel"
                disabled={isSubmitting}
                {...register("phone")}
              />
            </FormField>

            <FormField id="status" label={t.status} error={errors.status?.message}>
              <Select
                {...fieldAria("status", { error: errors.status?.message })}
                disabled={isSubmitting}
                {...register("status")}
              >
                {Object.entries(tenantStatusLabels(d)).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="legalForm"
              label={t.legalForm}
              error={errors.legalForm?.message}
              hint={t.legalFormHint}
            >
              <Select
                {...fieldAria("legalForm", {
                  error: errors.legalForm?.message,
                })}
                disabled={isSubmitting}
                {...register("legalForm")}
              >
                {Object.entries(tenantLegalFormLabels(d)).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{t.sectionIdentity}</h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionIdentityHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="idCardNumber"
              label={t.idCard}
              error={errors.idCardNumber?.message}
            >
              <Input
                {...fieldAria("idCardNumber", {
                  error: errors.idCardNumber?.message,
                })}
                autoCapitalize="characters"
                disabled={isSubmitting}
                {...register("idCardNumber")}
              />
            </FormField>

            <FormField id="pesel" label={t.nationalId} error={errors.pesel?.message}>
              <Input
                {...fieldAria("pesel", { error: errors.pesel?.message })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("pesel")}
              />
            </FormField>

            <FormField
              id="passportNumber"
              label={t.passport}
              error={errors.passportNumber?.message}
            >
              <Input
                {...fieldAria("passportNumber", {
                  error: errors.passportNumber?.message,
                })}
                autoCapitalize="characters"
                disabled={isSubmitting}
                {...register("passportNumber")}
              />
            </FormField>

            <FormField
              id="residenceCardNumber"
              label={t.residenceCard}
              error={errors.residenceCardNumber?.message}
            >
              <Input
                {...fieldAria("residenceCardNumber", {
                  error: errors.residenceCardNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("residenceCardNumber")}
              />
            </FormField>

            <FormField
              id="dateOfBirth"
              label={t.dateOfBirth}
              error={errors.dateOfBirth?.message}
              hint={t.dateOfBirthHint}
            >
              <DateInput
                {...fieldAria("dateOfBirth", {
                  error: errors.dateOfBirth?.message,
                })}

                disabled={isSubmitting}
                {...register("dateOfBirth")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">
            {t.sectionEmergency}
          </h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionEmergencyHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="emergencyContactFirstName"
              label={t.firstName}
              error={errors.emergencyContactFirstName?.message}
            >
              <Input
                {...fieldAria("emergencyContactFirstName", {
                  error: errors.emergencyContactFirstName?.message,
                })}
                disabled={isSubmitting}
                {...register("emergencyContactFirstName")}
              />
            </FormField>

            <FormField
              id="emergencyContactLastName"
              label={t.lastName}
              error={errors.emergencyContactLastName?.message}
            >
              <Input
                {...fieldAria("emergencyContactLastName", {
                  error: errors.emergencyContactLastName?.message,
                })}
                disabled={isSubmitting}
                {...register("emergencyContactLastName")}
              />
            </FormField>

            <FormField
              id="emergencyContactPhone"
              label={t.phone}
              error={errors.emergencyContactPhone?.message}
            >
              <Input
                {...fieldAria("emergencyContactPhone", {
                  error: errors.emergencyContactPhone?.message,
                })}
                type="tel"
                disabled={isSubmitting}
                {...register("emergencyContactPhone")}
              />
            </FormField>

            <FormField
              id="emergencyContactEmail"
              label={t.email}
              error={errors.emergencyContactEmail?.message}
            >
              <Input
                {...fieldAria("emergencyContactEmail", {
                  error: errors.emergencyContactEmail?.message,
                })}
                type="email"
                disabled={isSubmitting}
                {...register("emergencyContactEmail")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{t.sectionRegistered}</h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionRegisteredHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="registeredStreet"
              label={t.street}
              error={errors.registeredStreet?.message}
              className="sm:col-span-6"
            >
              <Input
                {...fieldAria("registeredStreet", {
                  error: errors.registeredStreet?.message,
                })}
                disabled={isSubmitting}
                {...register("registeredStreet")}
              />
            </FormField>

            <FormField
              id="registeredPostalCode"
              label={t.postalCode}
              error={errors.registeredPostalCode?.message}
              className="sm:col-span-2"
            >
              <PostalCodeInput
                {...fieldAria("registeredPostalCode", {
                  error: errors.registeredPostalCode?.message,
                })}
                disabled={isSubmitting}
                {...register("registeredPostalCode")}
              />
            </FormField>

            <FormField
              id="registeredCity"
              label={t.city}
              error={errors.registeredCity?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("registeredCity", {
                  error: errors.registeredCity?.message,
                })}
                disabled={isSubmitting}
                {...register("registeredCity")}
              />
            </FormField>

            <FormField
              id="registeredUntil"
              label={t.registeredUntil}
              error={errors.registeredUntil?.message}
              hint={t.registeredUntilHint}
              className="sm:col-span-2"
            >
              <DateInput
                {...fieldAria("registeredUntil", {
                  error: errors.registeredUntil?.message,
                })}

                disabled={isSubmitting}
                {...register("registeredUntil")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{d.panel.panelMisc.sectionPayments}</h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionBillingContactHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="billingEmail"
              label={t.billingEmail}
              error={errors.billingEmail?.message}
            >
              <Input
                {...fieldAria("billingEmail", {
                  error: errors.billingEmail?.message,
                })}
                type="email"
                disabled={isSubmitting}
                {...register("billingEmail")}
              />
            </FormField>

            <FormField
              id="billingPhone"
              label={t.billingPhone}
              error={errors.billingPhone?.message}
            >
              <Input
                {...fieldAria("billingPhone", {
                  error: errors.billingPhone?.message,
                })}
                type="tel"
                disabled={isSubmitting}
                {...register("billingPhone")}
              />
            </FormField>

            <FormField
              id="depositRefundAccount"
              label={t.depositAccount}
              error={errors.depositRefundAccount?.message}
              hint={t.depositAccountHint}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("depositRefundAccount", {
                  error: errors.depositRefundAccount?.message,
                })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("depositRefundAccount")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{t.sectionWork}</h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionWorkHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="employerName"
              label={t.employer}
              error={errors.employerName?.message}
            >
              <Input
                {...fieldAria("employerName", {
                  error: errors.employerName?.message,
                })}
                disabled={isSubmitting}
                {...register("employerName")}
              />
            </FormField>

            <FormField
              id="employmentUntil"
              label={t.until}
              error={errors.employmentUntil?.message}
              hint={t.untilHint}
            >
              <DateInput
                {...fieldAria("employmentUntil", {
                  error: errors.employmentUntil?.message,
                })}

                disabled={isSubmitting}
                {...register("employmentUntil")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">{t.sectionInsurance}</h2>
          <p className="-mt-2 text-xs text-muted">
            {t.sectionInsuranceHint}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="insurerName" label={t.insurer} error={errors.insurerName?.message}>
              <Input
                {...fieldAria("insurerName", {
                  error: errors.insurerName?.message,
                })}
                disabled={isSubmitting}
                {...register("insurerName")}
              />
            </FormField>

            <FormField
              id="insurancePolicyNumber"
              label={t.policyNumber}
              error={errors.insurancePolicyNumber?.message}
            >
              <Input
                {...fieldAria("insurancePolicyNumber", {
                  error: errors.insurancePolicyNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("insurancePolicyNumber")}
              />
            </FormField>

            <FormField
              id="insuranceExpiresAt"
              label={t.validUntil}
              error={errors.insuranceExpiresAt?.message}
            >
              <DateInput
                {...fieldAria("insuranceExpiresAt", {
                  error: errors.insuranceExpiresAt?.message,
                })}

                disabled={isSubmitting}
                {...register("insuranceExpiresAt")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-fg">{t.sectionBilling}</h2>
              <p className="mt-1 text-xs text-muted">
                {t.sectionBillingHint}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={copyRegisteredAddress}
              disabled={isSubmitting || !hasRegisteredAddress}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {t.copyRegistered}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="street"
              label={t.street}
              error={errors.street?.message}
              className="sm:col-span-6"
            >
              <Input
                {...fieldAria("street", { error: errors.street?.message })}
                disabled={isSubmitting}
                {...register("street")}
              />
            </FormField>

            <FormField
              id="postalCode"
              label={t.postalCode}
              error={errors.postalCode?.message}
              className="sm:col-span-2"
            >
              <PostalCodeInput
                {...fieldAria("postalCode", {
                  error: errors.postalCode?.message,
                })}
                disabled={isSubmitting}
                {...register("postalCode")}
              />
            </FormField>

            <FormField
              id="city"
              label={t.city}
              error={errors.city?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("city", { error: errors.city?.message })}
                disabled={isSubmitting}
                {...register("city")}
              />
            </FormField>

            <FormField
              id="taxId"
              label={t.taxId}
              error={errors.taxId?.message}
              hint={t.taxIdHint}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("taxId", { error: errors.taxId?.message })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("taxId")}
              />
            </FormField>

            {/* Podpowiedź zmienia się razem z wyborem — różnica między
                rachunkiem a naliczeniem jest istotna księgowo, a z samych
                nazw nie da się jej odczytać. */}
            <FormField
              id="documentKind"
              label={t.documentKind}
              error={errors.documentKind?.message}
              hint={tenantDocumentKindHints(d)[documentKind ?? "BILL"]}
              className="sm:col-span-2"
            >
              <Select
                {...fieldAria("documentKind", {
                  error: errors.documentKind?.message,
                })}
                disabled={isSubmitting}
                {...register("documentKind")}
              >
                {selectableTenantDocumentKinds(locale).map((value) => (
                  <option key={value} value={value}>
                    {invoiceKindLabels(d)[value]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField
            id="notes"
            label={t.notes}
            error={errors.notes?.message}
            hint={t.notesHint}
          >
            <Textarea
              {...fieldAria("notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t.saving}
            </>
          ) : isEdit ? (
            d.panel.common.saveChanges
          ) : (
            d.panel.tenantsPage.add
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.back()}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}
