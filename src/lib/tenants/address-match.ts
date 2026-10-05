import { formatStreetLine, type PropertyAddress } from "@/lib/properties/address";

/**
 * Kto mieszka pod adresem nieruchomości — do zawężenia listy w kreatorze umowy.
 *
 * Najemca nie ma w bazie powiązania z nieruchomością poza umową. Ma za to adres
 * korespondencyjny, który przy najmie mieszkania jest zwykle adresem tego
 * mieszkania — i to po nim szukamy. Drugie źródło to wcześniejsze umowy:
 * przedłużenie albo nowa umowa po wygasłej ma pokazać tego samego najemcę,
 * nawet gdy w karcie wpisał adres rodziców.
 */

export type MatchableTenant = {
  street: string | null;
  city: string | null;
  /** Nieruchomości z umów najemcy — także tych zakończonych i w archiwum. */
  leasePropertyIds: string[];
};

export type MatchableProperty = { id: string } & PropertyAddress;

/** Przedrostki ulicy, które jedni wpisują, a inni nie: „ul. Długa" = „Długa". */
const STREET_PREFIX = /^(ul|ulica|al|aleja|aleje|os|osiedle|pl|plac)\.?\s+/;

/**
 * Sprowadza zapis adresu do jednej postaci.
 *
 * Właściciel wpisuje adres najemcy z ręki, a nieruchomości z formularza
 * z osobnymi polami — „ul. Długa 14 m. 3" i „Długa 14/3" mają być tym samym.
 * Polskie znaki zdejmujemy, bo z telefonu często idą bez nich.
 */
export function normalizeStreet(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(STREET_PREFIX, "")
    // „14 m. 3", „14 m 3", „14 lok. 3" → „14/3"
    .replace(/\s+(m|lok|lokal|mieszk)(\.\s*|\s+)(?=\w)/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[\s,.;]+$/, "");
}

function normalizeCity(value: string): string {
  return normalizeStreet(value);
}

/** Czy adres najemcy wskazuje tę nieruchomość. */
export function tenantAddressMatches(
  tenant: Pick<MatchableTenant, "street" | "city">,
  property: PropertyAddress,
): boolean {
  if (!tenant.street?.trim()) return false;

  const target = normalizeStreet(formatStreetLine(property));
  const street = normalizeStreet(tenant.street);
  if (!target || !street.startsWith(target)) return false;

  // Granica numeru: „Długa 14" nie może łapać „Długa 145" ani „Długa 14a".
  // Ukośnik po numerze budynku jest w porządku tylko wtedy, gdy nieruchomość
  // to cały budynek — najemca z „Długa 14/3" mieszka wtedy pod tym adresem.
  const next = street.charAt(target.length);
  const hasApartment = Boolean(property.apartmentNumber?.trim());
  if (next !== "" && (/[a-z0-9]/.test(next) || (next === "/" && hasApartment))) return false;

  // Miasto porównujemy tylko, gdy obie strony je mają — Długa jest w każdym
  // mieście, ale brak miasta w karcie nie może chować najemcy.
  if (tenant.city?.trim() && property.city?.trim()) {
    return normalizeCity(tenant.city) === normalizeCity(property.city);
  }

  return true;
}

/** Identyfikatory nieruchomości, pod którymi najemca mieszka albo mieszkał. */
export function tenantPropertyIds(
  tenant: MatchableTenant,
  properties: MatchableProperty[],
): string[] {
  return properties
    .filter(
      (property) =>
        tenant.leasePropertyIds.includes(property.id) || tenantAddressMatches(tenant, property),
    )
    .map((property) => property.id);
}
