import type { InvoiceKind, VatRate } from "@/generated/prisma/enums";
import { planAllows } from "@/lib/billing/features";
import { DEFAULT_PLAN } from "@/lib/billing/plans";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { formatPropertyAddress, roomDesignation } from "@/lib/properties/address";
import { slugify } from "@/lib/utils";
import { invoiceKindLabels } from "@/lib/validations/invoice";

import type { InvoicePdfData } from "./pdf";
import type { getInvoice } from "./service";

/**
 * Rekord z bazy → dane dla PDF-a.
 *
 * Wydzielone z trasy, bo to samo przekształcenie robi pobieranie pojedynczego
 * dokumentu i pobieranie paczki. Dwa niezależne mapowania rozjechałyby się przy
 * pierwszej zmianie układu dokumentu — i zauważyłby to dopiero księgowy.
 */
export type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** Kraj wystawcy dokumentu. Nieznana wartość w bazie schodzi do domyślnego. */
function invoiceLocale(invoice: { organization: { locale: string } }) {
  return isLocale(invoice.organization.locale) ? invoice.organization.locale : DEFAULT_LOCALE;
}

/**
 * Nazwa pliku PDF: rodzaj dokumentu i numer, czyli „faktura-3-09-2026.pdf".
 *
 * Sam numer nie wystarcza, odkąd faktura idzie bez liter serii — plik nazwany
 * „3-09-2026.pdf" nie mówi w folderze pobranych, czym jest, a przy kilku
 * dokumentach z jednego miesiąca nie da się ich rozróżnić.
 *
 * Jedno miejsce dla wszystkich trzech ścieżek pobierania (panel, portal
 * najemcy, załącznik w mailu): to ten sam dokument i po zapisaniu z dwóch
 * różnych miejsc ma nosić tę samą nazwę.
 */
export function invoicePdfFilename(invoice: {
  kind: InvoiceKind;
  number: string;
  organization: { locale: string };
}): string {
  const label = invoiceKindLabels(getDictionary(invoiceLocale(invoice)))[invoice.kind];

  return `${slugify(`${label} ${invoice.number}`)}.pdf`;
}

export function toInvoicePdfData(invoice: InvoiceWithRelations): InvoicePdfData {
  // Rozbicie po stawkach liczymy z zapisanych pozycji — w bazie nie ma na nie
  // kolumny, a przeliczanie z warunków umowy dałoby inny wynik po korekcie.
  const byRate = new Map<VatRate, { netGrosze: number; vatGrosze: number }>();
  for (const line of invoice.lines) {
    const bucket = byRate.get(line.vatRate) ?? { netGrosze: 0, vatGrosze: 0 };
    bucket.netGrosze += line.netGrosze;
    bucket.vatGrosze += line.vatGrosze;
    byRate.set(line.vatRate, bucket);
  }

  const locale = invoiceLocale(invoice);

  const property = invoice.lease?.property;
  const subject = property
    ? [
        property.name,
        invoice.lease?.room
          ? fill(getDictionary(locale).documents.invoice.roomSubject, {
              name: roomDesignation(invoice.lease.room.name),
            })
          : null,
        formatPropertyAddress(property),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    locale,
    kind: invoice.kind,
    number: invoice.number,
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    cancelled: invoice.status === "CANCELLED",

    seller: {
      name: invoice.organization.name,
      taxId: invoice.organization.taxId,
      street: invoice.organization.street,
      postalCode: invoice.organization.postalCode,
      city: invoice.organization.city,
    },

    /*
      Logo na dokumentach wchodzi z planem Start. Bramka stoi także tutaj,
      a nie tylko przy wgrywaniu: konto, które spadło na niższy próg, ma
      wgrany obrazek w bazie, a dokument nie może go dalej drukować.
    */
    logoDataUrl: planAllows(
      invoice.organization.subscription?.plan ?? DEFAULT_PLAN,
      "DOCUMENT_LOGO",
    )
      ? invoice.organization.logo?.dataUrl ?? null
      : null,

    buyer: {
      name: invoice.buyerName,
      taxId: invoice.buyerTaxId,
      street: invoice.buyerStreet,
      postalCode: invoice.buyerPostalCode,
      city: invoice.buyerCity,
    },

    subject,

    bankAccount: invoice.organization.bankAccount,

    lines: invoice.lines.map((line) => ({
      description: line.description,
      // Decimal(12,3) → tysięczne, w których liczy reszta aplikacji.
      quantityMilli: Math.round(Number(line.quantity) * 1000),
      unit: line.unit,
      unitPriceNetGrosze: line.unitPriceNetGrosze,
      vatRate: line.vatRate,
      netGrosze: line.netGrosze,
      vatGrosze: line.vatGrosze,
      grossGrosze: line.grossGrosze,
    })),

    vatBreakdown: [...byRate.entries()].map(([rate, sums]) => ({ rate, ...sums })),

    totalNetGrosze: invoice.totalNetGrosze,
    totalVatGrosze: invoice.totalVatGrosze,
    totalGrossGrosze: invoice.totalGrossGrosze,
    paidGrosze: invoice.paidGrosze,

    notes: invoice.notes,
  };
}
