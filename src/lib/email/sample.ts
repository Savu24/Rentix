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
export function sampleInvoiceData(landlordName: string): InvoiceEmailData & { daysOverdue: number } {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 5);

  return {
    tenantFirstName: "Anna",
    tenantLastName: "Kowalska",
    landlordName,
    propertyAddress: "Długa 14/3, 30-001 Kraków",
    invoiceNumber: "R 6/08/2026",
    amountGrosze: 262900,
    remainingGrosze: 262900,
    dueDate,
    periodLabel: "sierpień 2026",
    attached: true,
    daysOverdue: 5,
  };
}
