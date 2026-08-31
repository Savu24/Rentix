import type { LeaseStatus } from "@/generated/prisma/enums";
import type { TenantSort } from "@/lib/validations/tenant";

export type SortableTenant = {
  firstName: string;
  lastName: string;
  archivedAt: Date | null;
  outstandingGrosze: number;
  lease: { status: LeaseStatus; propertyAddress: string } | null;
};

/**
 * Kolejność statusów umowy na liście: najpierw ci, u których coś trwa.
 *
 * Nie bierzemy kolejności z enuma bazy — tam szkic stoi przed aktywną, bo enum
 * opisuje drogę umowy, a lista odpowiada na pytanie „kim mam się zająć".
 */
const LEASE_RANK: Record<LeaseStatus, number> = {
  ACTIVE: 0,
  RESERVED: 1,
  DRAFT: 2,
  TERMINATED: 3,
  EXPIRED: 4,
};

/** Bez umowy — na koniec każdego porządku, który o umowę pyta. */
const NO_LEASE_RANK = 9;

const collator = new Intl.Collator("pl");

const byName = (a: SortableTenant, b: SortableTenant) =>
  collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName);

/**
 * Porządek listy najemców.
 *
 * Sortujemy w pamięci, a nie w bazie: saldo i adres nie są kolumnami najemcy —
 * pierwsze wychodzi z faktur ze wszystkich jego umów, drugie z nieruchomości
 * po drugiej stronie umowy. Lista jest z założenia krótka (portfel właściciela,
 * nie kartoteka miasta), więc to tańsze niż zapytanie z dwoma joinami
 * i agregatem.
 *
 * Zarchiwizowani zostają na końcu niezależnie od wybranego porządku — są
 * w spisie po to, żeby dało się ich odszukać, a nie żeby wchodzili w drogę.
 */
export function sortTenants<T extends SortableTenant>(tenants: T[], sort: TenantSort): T[] {
  const compare = (a: T, b: T) => {
    const archived = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
    if (archived !== 0) return archived;

    if (sort === "address") {
      const left = a.lease?.propertyAddress ?? "";
      const right = b.lease?.propertyAddress ?? "";
      // Najemca bez umowy nie ma adresu mieszkania — pusty ciąg wylądowałby
      // na górze listy, czyli dokładnie tam, gdzie nikt go nie szuka.
      if (left === "" || right === "") {
        if (left !== right) return left === "" ? 1 : -1;
      } else if (collator.compare(left, right) !== 0) {
        return collator.compare(left, right);
      }
    }

    if (sort === "debt") {
      // Największa zaległość na górze: lista zaległości czytana od dołu nie ma
      // sensu, a to jedyny powód, dla którego się po nią sięga.
      if (a.outstandingGrosze !== b.outstandingGrosze) {
        return b.outstandingGrosze - a.outstandingGrosze;
      }
    }

    if (sort === "leaseStatus") {
      const left = a.lease ? LEASE_RANK[a.lease.status] : NO_LEASE_RANK;
      const right = b.lease ? LEASE_RANK[b.lease.status] : NO_LEASE_RANK;
      if (left !== right) return left - right;
    }

    return byName(a, b);
  };

  return [...tenants].sort(compare);
}
