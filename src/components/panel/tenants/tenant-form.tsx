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
import { INVOICE_KIND_LABEL } from "@/lib/validations/invoice";
import {
  TENANT_DOCUMENT_KIND_HINT,
  TENANT_DOCUMENT_KIND_OPTIONS,
  TENANT_LEGAL_FORM_LABEL,
  TENANT_STATUS_LABEL,
  tenantFormSchema,
  type TenantFormInput,
  type TenantFormOutput,
} from "@/lib/validations/tenant";

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
    resolver: zodResolver(tenantFormSchema),
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
          <h2 className="text-[15px] font-semibold text-fg">Dane najemcy</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="Imię" error={errors.firstName?.message}>
              <Input
                {...fieldAria("firstName", {
                  error: errors.firstName?.message,
                })}
                autoComplete="given-name"
                disabled={isSubmitting}
                {...register("firstName")}
              />
            </FormField>

            <FormField id="lastName" label="Nazwisko" error={errors.lastName?.message}>
              <Input
                {...fieldAria("lastName", { error: errors.lastName?.message })}
                autoComplete="family-name"
                disabled={isSubmitting}
                {...register("lastName")}
              />
            </FormField>

            <FormField
              id="email"
              label="E-mail"
              error={errors.email?.message}
              hint="Bez adresu nie wyślemy przypomnień o płatności."
            >
              <Input
                {...fieldAria("email", { error: errors.email?.message })}
                type="email"
                autoComplete="email"
                disabled={isSubmitting}
                {...register("email")}
              />
            </FormField>

            <FormField id="phone" label="Telefon" error={errors.phone?.message}>
              <Input
                {...fieldAria("phone", { error: errors.phone?.message })}
                type="tel"
                autoComplete="tel"
                disabled={isSubmitting}
                {...register("phone")}
              />
            </FormField>

            <FormField id="status" label="Status" error={errors.status?.message}>
              <Select
                {...fieldAria("status", { error: errors.status?.message })}
                disabled={isSubmitting}
                {...register("status")}
              >
                {Object.entries(TENANT_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="legalForm"
              label="Forma prawna"
              error={errors.legalForm?.message}
              hint="Przy firmie uzupełnij NIP w danych do faktury."
            >
              <Select
                {...fieldAria("legalForm", {
                  error: errors.legalForm?.message,
                })}
                disabled={isSubmitting}
                {...register("legalForm")}
              >
                {Object.entries(TENANT_LEGAL_FORM_LABEL).map(([value, label]) => (
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
          <h2 className="text-[15px] font-semibold text-fg">Dokumenty tożsamości</h2>
          <p className="-mt-2 text-xs text-muted">
            Wszystkie pola opcjonalne. Wpisz to, co najemca okazał.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="idCardNumber"
              label="Dowód osobisty"
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

            <FormField id="pesel" label="PESEL" error={errors.pesel?.message}>
              <Input
                {...fieldAria("pesel", { error: errors.pesel?.message })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("pesel")}
              />
            </FormField>

            <FormField
              id="passportNumber"
              label="Numer paszportu"
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
              label="Karta pobytu"
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
              label="Data urodzenia"
              error={errors.dateOfBirth?.message}
              hint="Przepisujesz ją z tego samego dokumentu co numer."
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
            Kontakt na wypadek nagłego zdarzenia
          </h2>
          <p className="-mt-2 text-xs text-muted">
            Osoba, do której zadzwonisz, gdy nie da się dodzwonić do najemcy.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="emergencyContactFirstName"
              label="Imię"
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
              label="Nazwisko"
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
              label="Telefon"
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
              label="E-mail"
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
          <h2 className="text-[15px] font-semibold text-fg">Adres zameldowania</h2>
          <p className="-mt-2 text-xs text-muted">
            Adres z dowodu: ten, pod który najemca wróci po zakończeniu najmu. Wchodzi do umowy
            najmu okazjonalnego i nie musi być tym samym, co adres do faktury.
          </p>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="registeredStreet"
              label="Ulica i numer"
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
              label="Kod pocztowy"
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
              label="Miejscowość"
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
              label="Zameldowanie do"
              error={errors.registeredUntil?.message}
              hint="Puste = bezterminowe."
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
          <h2 className="text-[15px] font-semibold text-fg">Płatności</h2>
          <p className="-mt-2 text-xs text-muted">
            Wypełnij tylko wtedy, gdy za czynsz odpowiada ktoś inny niż najemca, np. rodzic albo
            księgowość jego firmy.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="billingEmail"
              label="E-mail do płatności"
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
              label="Telefon do płatności"
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
              label="Rachunek do zwrotu kaucji"
              error={errors.depositRefundAccount?.message}
              hint="Wpisany na starcie oszczędza szukania numeru w dniu wyprowadzki."
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
          <h2 className="text-[15px] font-semibold text-fg">Praca i studia</h2>
          <p className="-mt-2 text-xs text-muted">
            Najkrótsza odpowiedź na pytanie, z czego ten najemca zapłaci.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="employerName"
              label="Pracodawca lub uczelnia"
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
              label="Do kiedy"
              error={errors.employmentUntil?.message}
              hint="Puste = bezterminowo."
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
          <h2 className="text-[15px] font-semibold text-fg">Ubezpieczenie najemcy</h2>
          <p className="-mt-2 text-xs text-muted">
            Polisa OC, do której sięgasz przy szkodzie, np. zalaniu sąsiada albo zniszczeniu sprzętu.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="insurerName" label="Ubezpieczyciel" error={errors.insurerName?.message}>
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
              label="Numer polisy"
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
              label="Ważna do"
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
              <h2 className="text-[15px] font-semibold text-fg">Dane do faktury</h2>
              <p className="mt-1 text-xs text-muted">
                Trafiają na fakturę jako dane nabywcy. Możesz uzupełnić je później.
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
              Skopiuj adres zameldowania
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="street"
              label="Ulica i numer"
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
              label="Kod pocztowy"
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
              label="Miejscowość"
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
              label="NIP"
              error={errors.taxId?.message}
              hint="Tylko dla firm."
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
              label="Co wystawiamy"
              error={errors.documentKind?.message}
              hint={TENANT_DOCUMENT_KIND_HINT[documentKind ?? "BILL"]}
              className="sm:col-span-2"
            >
              <Select
                {...fieldAria("documentKind", {
                  error: errors.documentKind?.message,
                })}
                disabled={isSubmitting}
                {...register("documentKind")}
              >
                {TENANT_DOCUMENT_KIND_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_KIND_LABEL[value]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField
            id="notes"
            label="Notatki wewnętrzne"
            error={errors.notes?.message}
            hint="Widoczne tylko dla Ciebie."
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
              Zapisywanie…
            </>
          ) : isEdit ? (
            "Zapisz zmiany"
          ) : (
            "Dodaj najemcę"
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
