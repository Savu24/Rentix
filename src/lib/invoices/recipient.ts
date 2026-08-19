/**
 * Kto dostaje dokument.
 *
 * Do niedawna odbiorca istniał wyłącznie przez umowę, a `Invoice` znał najemcę
 * tylko jako migawkę w kolumnach `buyer*`. Migawka jest tam słusznie — dane
 * nabywcy na wystawionym dokumencie nie mogą się zmieniać, gdy ktoś potem
 * poprawi kartotekę. Do wysyłki jednak nie wystarcza, bo adres e-mail bywa
 * poprawiany właśnie dlatego, że był błędny.
 *
 * Stąd dwie drogi do odbiorcy i jedno miejsce, które o nich rozstrzyga.
 */

export type RecipientTenant = {
  firstName: string;
  lastName?: string | null;
  email: string | null;
  userId?: string | null;
};

export type InvoiceWithRecipient = {
  lease?: { tenants: Array<{ tenant: RecipientTenant }> } | null;
  tenant?: RecipientTenant | null;
};

/**
 * Najemca z umowy, a gdy dokument stoi poza umową — nabywca wskazany przy
 * wystawieniu.
 *
 * Umowa ma pierwszeństwo, bo to ona opisuje bieżący stosunek najmu. Nabywca
 * zapisany na fakturze bywa historyczny: umowa mogła zostać przepisana na kogoś
 * innego, a dokumenty sprzed zmiany zostają z poprzednim najemcą.
 *
 * `null` znaczy, że dokumentu nie ma komu wysłać — i to jest inny przypadek
 * niż odbiorca bez adresu e-mail. Wołający mają je rozróżniać, bo prowadzą do
 * dwóch różnych miejsc w panelu.
 */
export function invoiceRecipient(invoice: InvoiceWithRecipient): RecipientTenant | null {
  return invoice.lease?.tenants[0]?.tenant ?? invoice.tenant ?? null;
}
