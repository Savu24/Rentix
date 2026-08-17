import bcrypt from "bcryptjs";

/**
 * Koszt 12 ≈ 250 ms na typowym serwerze. Wyżej robi się zauważalne opóźnienie
 * logowania, niżej — zbyt tanio dla atakującego z GPU.
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash konta, które nie istnieje — porównanie z nim zajmuje tyle samo czasu
 * co porównanie z prawdziwym hasłem.
 *
 * Bez tego czas odpowiedzi zdradza, czy dany e-mail jest zarejestrowany:
 * nieistniejące konto odpowiadałoby natychmiast, istniejące po ~250 ms.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.9nnpVkPCK9C0zOb7v5ff2rZ9NxLQXFC";

export async function fakeVerify(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
