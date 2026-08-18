/**
 * Nagłówek nadawcy powiadomień.
 *
 * Wiadomości wychodzą zawsze z jednego adresu — tego, którego domena ma rekordy
 * SPF i DKIM. Nie da się tego obejść przy wielu klientach: żeby wysyłać
 * naprawdę z adresu wynajmującego, trzeba by trzymać hasło do jego skrzynki.
 *
 * Zmienia się natomiast **nazwa wyświetlana**: najemca widzi w skrzynce swojego
 * wynajmującego, nie platformę. Odpowiedź kierujemy nagłówkiem Reply-To na adres
 * kontaktowy wynajmującego, więc rozmowa toczy się między nimi, z pominięciem
 * platformy.
 *
 * Ten sam podział stosuje każdy SaaS wysyłający pocztę w cudzym imieniu —
 * powiadomienie o zamówieniu przychodzi z serwerów sklepu internetowego,
 * a w polu nadawcy widnieje nazwa sprzedawcy.
 */

/** Wyłuskuje sam adres z `Nazwa <adres@domena>`; adres bez nazwy zwraca bez zmian. */
export function senderAddress(emailFrom: string): string {
  const match = emailFrom.match(/<([^>]+)>/);
  return (match ? match[1] : emailFrom).trim();
}

/**
 * Składa nagłówek `From` z nazwą wynajmującego przed adresem platformy.
 *
 * Bez nazwy zwraca `emailFrom` w całości — konfiguracja może już zawierać
 * własną nazwę platformy i nie ma powodu jej gubić.
 */
export function formatFrom(emailFrom: string, displayName?: string | null): string {
  const name = displayName?.trim();
  if (!name) return emailFrom;

  /*
    Cudzysłów wokół nazwy jest obowiązkowy, nie kosmetyczny: nazwy firm
    zawierają przecinki i kropki („Miret, sp. z o.o."), a te bez cudzysłowu
    rozbijają nagłówek na kilku adresatów. Znak cudzysłowu i ukośnik wewnątrz
    nazwy trzeba dodatkowo poprzedzić ukośnikiem.
  */
  const escaped = name.replace(/([\\"])/g, "\\$1");
  return `"${escaped}" <${senderAddress(emailFrom)}>`;
}
