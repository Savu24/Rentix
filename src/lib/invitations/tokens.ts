import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Tokeny zaproszeń — losowanie, skrót i adres linku.
 *
 * Bez Prismy, bez sesji i bez `env`, żeby dało się to sprawdzić testem: to
 * jedyny element zaproszeń, w którym pomyłka nie objawia się błędem, tylko
 * cichą dziurą. Adres bezwzględny mieszka obok, w `url.ts` — ten potrzebuje
 * zmiennych środowiskowych, których test nie ma i nie musi mieć.
 */

/**
 * Ile bajtów losowości ma token.
 *
 * 32 bajty to 256 bitów — tyle samo, co klucz sesji. Token jest jedynym
 * dowodem tożsamości przy zakładaniu konta z zaproszenia, więc zgadnięcie go
 * musi być tak samo nierealne jak zgadnięcie ciasteczka sesji.
 */
const TOKEN_BYTES = 32;

/** Ile dni żyje zaproszenie. */
export const INVITATION_TTL_DAYS = 14;

export type IssuedToken = {
  /** Trafia wyłącznie do linku w mailu. */
  token: string;
  /** Trafia wyłącznie do bazy. */
  tokenHash: string;
};

/** Skrót tokenu — to on leży w bazie i po nim szukamy zaproszenia. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueToken(): IssuedToken {
  // base64url, bo token idzie w ścieżce adresu — „+", „/" i „=" wymagałyby
  // kodowania procentowego i rozjeżdżały linki kopiowane ze skrzynki.
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/**
 * Porównanie skrótów w stałym czasie.
 *
 * Samo wyszukanie po `tokenHash` w bazie i tak nie jest stałoczasowe, więc to
 * nie zamyka kanału bocznego całkowicie — ale nie dokłada własnego, a kosztuje
 * jedną linijkę.
 */
export function tokenMatches(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");

  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function invitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Ścieżka strony przyjmującej zaproszenie. Bez prefiksu kraju — patrz strona. */
export function invitationPath(token: string): string {
  return `/zaproszenie/${encodeURIComponent(token)}`;
}
