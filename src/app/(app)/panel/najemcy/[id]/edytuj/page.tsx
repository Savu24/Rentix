import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormPage } from "@/components/panel/form-page";
import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { getTenant } from "@/lib/tenants/service";

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.editTitle };
}

/** Pola dat czytają wyłącznie „RRRR-MM-DD"; brak daty = puste pole. */
const dateValue = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const tenant = await getTenant(session.user.organizationId, id);
  if (!tenant) notFound();

  return (
    <FormPage
      back={{ href: `/panel/najemcy/${tenant.id}`, label: `${tenant.firstName} ${tenant.lastName}` }}
      title={(await panelDictionary()).panel.tenantsPage.editTitle}
    >
      <TenantForm
        tenantId={tenant.id}
        defaultValues={{
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          status: tenant.status,
          email: tenant.email ?? "",
          phone: tenant.phone ?? "",
          street: tenant.street ?? "",
          postalCode: tenant.postalCode ?? "",
          city: tenant.city ?? "",
          taxId: tenant.taxId ?? "",
          documentKind: tenant.documentKind,
          legalForm: tenant.legalForm,
          dateOfBirth: dateValue(tenant.dateOfBirth),
          idCardNumber: tenant.idCardNumber ?? "",
          pesel: tenant.pesel ?? "",
          passportNumber: tenant.passportNumber ?? "",
          residenceCardNumber: tenant.residenceCardNumber ?? "",
          emergencyContactFirstName: tenant.emergencyContactFirstName ?? "",
          emergencyContactLastName: tenant.emergencyContactLastName ?? "",
          emergencyContactPhone: tenant.emergencyContactPhone ?? "",
          emergencyContactEmail: tenant.emergencyContactEmail ?? "",
          registeredStreet: tenant.registeredStreet ?? "",
          registeredPostalCode: tenant.registeredPostalCode ?? "",
          registeredCity: tenant.registeredCity ?? "",
          registeredUntil: dateValue(tenant.registeredUntil),
          billingEmail: tenant.billingEmail ?? "",
          billingPhone: tenant.billingPhone ?? "",
          depositRefundAccount: tenant.depositRefundAccount ?? "",
          employerName: tenant.employerName ?? "",
          employmentUntil: dateValue(tenant.employmentUntil),
          insurerName: tenant.insurerName ?? "",
          insurancePolicyNumber: tenant.insurancePolicyNumber ?? "",
          insuranceExpiresAt: dateValue(tenant.insuranceExpiresAt),
          notes: tenant.notes ?? "",
        }}
      />
    </FormPage>
  );
}
