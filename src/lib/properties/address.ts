/**
 * Składanie adresu nieruchomości — jedno miejsce dla całej aplikacji.
 *
 * Adres pojawia się na karcie, na liście, w umowie, na fakturze i w panelu
 * najemcy. Zanim powstał ten moduł, każde z tych miejsc sklejało go własnym
 * szablonem — dołożenie numeru mieszkania oznaczałoby sześć poprawek i pewność,
 * że któraś się nie zgodzi z resztą.
 */

export type PropertyAddress = {
  street: string;
  buildingNumber: string;
  apartmentNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

/**
 * „Długa 14/3" — ulica z numerem budynku i lokalu.
 *
 * Ukośnik to polska konwencja zapisu (budynek/lokal), a nie ozdobnik: „Długa 14
 * m. 3" i „Długa 14/3" znaczą to samo, ale drugi zapis mieści się w wierszu
 * tabeli i tak wygląda na kopercie.
 */
export function formatStreetLine(property: PropertyAddress): string {
  const apartment = property.apartmentNumber?.trim();
  const building = apartment
    ? `${property.buildingNumber}/${apartment}`
    : property.buildingNumber;

  return `${property.street} ${building}`.trim();
}

/**
 * „Długa 14/3, 30-001 Kraków" — pełny adres do dokumentu i nagłówka karty.
 *
 * Puste miasto albo kod pocztowy nie zostawiają wiszącego przecinka: rekordy
 * przychodzą też z importu, gdzie bywają niekompletne.
 */
export function formatPropertyAddress(property: PropertyAddress): string {
  const locality = [property.postalCode, property.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return [formatStreetLine(property), locality].filter(Boolean).join(", ");
}

/**
 * Opis samego lokalu na umowę: „lokal nr 3" albo „budynek nr 14".
 *
 * Bez numeru mieszkania przedmiotem najmu jest cały budynek — i tak trzeba to
 * nazwać, bo „lokal nr 14" przy domu jednorodzinnym czytałoby się jak mieszkanie
 * o numerze 14, którego w tym budynku nie ma.
 */
export function formatUnitLabel(property: PropertyAddress): string {
  const apartment = property.apartmentNumber?.trim();
  return apartment ? `lokal nr ${apartment}` : `budynek nr ${property.buildingNumber}`;
}
