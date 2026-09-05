import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { periodLabel } from "@/lib/leases/billing";

import type { InvoiceEmailData } from "./templates";

/**
 * Przykładowy dokument do podglądu wiadomości w panelu.
 *
 * Wynajmujący pisze tekst, którego sam nigdy nie zobaczy w skrzynce, a wyśle go
 * do kilkudziesięciu osób. Podgląd jest więc jedynym momentem, w którym może
 * wychwycić, że po podstawieniu zmiennych zdanie przestaje się kleić — dlatego
 * dane są konkretne, a nie „Lorem ipsum": kwota z groszami, numer w formacie
 * z generatora, data z przyszłości.
 */
/**
 * Nazwiska i adres idą za wersją krajową. Podgląd ma pokazać wiadomość taką,
 * jaką zobaczy najemca — „Anna Kowalska, Długa 14/3" w angielskim mailu
 * kazałoby wynajmującemu zgadywać, co jest przykładem, a co pomyłką.
 */
const SAMPLES: Record<Locale, { firstName: string; lastName: string; address: string; number: string }> = {
  pl: {
    firstName: "Anna",
    lastName: "Kowalska",
    address: "Długa 14/3, 30-001 Kraków",
    number: "R 6/08/2026",
  },
  uk: {
    firstName: "Sarah",
    lastName: "Doyle",
    address: "14 Station Road, Birmingham B17 9LN",
    number: "INV 6/08/2026",
  },
};

export function sampleInvoiceData(
  landlordName: string,
  locale: Locale = DEFAULT_LOCALE,
): InvoiceEmailData & { daysOverdue: number } {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 5);

  const sample = SAMPLES[locale];

  return {
    locale,
    tenantFirstName: sample.firstName,
    tenantLastName: sample.lastName,
    landlordName,
    propertyAddress: sample.address,
    invoiceNumber: sample.number,
    amountGrosze: 262900,
    remainingGrosze: 262900,
    dueDate,
    periodLabel: periodLabel(2026, 7, locale),
    attached: true,
    daysOverdue: 5,
  };
}
