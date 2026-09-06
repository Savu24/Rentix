import "dotenv/config";

import { randomInt } from "node:crypto";

import { registerOwner } from "@/lib/auth/register";
import { prisma } from "@/lib/prisma";

/**
 * Zakłada konto administratora platformy.
 *
 *   npm run admin:create -- adres@example.com
 *   npm run admin:create -- adres@example.com --name "Jan Kowalski" --haslo "..."
 *
 * Osobno od `admin:grant`, który podnosi rolę istniejącemu kontu. Tutaj konta
 * jeszcze nie ma, a przejście przez formularz rejestracji wymagałoby potem
 * i tak wejścia skryptem po rolę — więc robimy oba kroki naraz.
 *
 * Konto dostaje własną organizację, tak samo jak każde inne konto właściciela.
 * Nie jest to ozdoba: `requireOwnerSession` wymaga przypisania do organizacji,
 * a rola ADMIN nie zwalnia z panelu klienta — administrator trafia do niego po
 * zalogowaniu i ma stamtąd przejście do `/admin`. Konto bez organizacji
 * wywracałoby ten panel wyjątkiem.
 *
 * Adres oznaczamy od razu jako potwierdzony: wiadomość aktywacyjna szłaby na
 * skrzynkę, do której skrypt i tak nie zagląda, a konto operatora ma działać
 * od pierwszej sekundy.
 */

/*
  Alfabety bez znaków, które mylą się przy przepisywaniu z ekranu: brak l/I/1
  i O/0. Hasło ma być podyktowane przez telefon bez pytania „duże czy małe i".
*/
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LOWER + UPPER + DIGITS;

/**
 * Hasło spełniające `passwordSchema`: co najmniej dziesięć znaków, w tym mała
 * litera, wielka i cyfra. Po jednym znaku z każdej grupy bierzemy na starcie,
 * resztę losowo — inaczej losowanie mogłoby trafić hasło bez cyfry, które
 * odbiłoby się od walidacji przy najbliższej zmianie.
 */
function generatePassword(length = 16): string {
  const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]!;

  const required = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));
  const characters = [...required, ...rest];

  // Tasowanie Fishera-Yatesa: bez niego trzy pierwsze znaki zawsze byłyby
  // w kolejności mała–wielka–cyfra, co zawęża hasło dla zgadującego.
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j]!, characters[i]!];
  }

  return characters.join("");
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("-"))?.trim().toLowerCase();

  if (!email) {
    console.error(
      "Podaj adres e-mail: npm run admin:create -- adres@example.com [--name „…\"] [--org „…\"] [--haslo „…\"]",
    );
    process.exitCode = 1;
    return;
  }

  const name = readOption(args, "name") ?? "Administrator";
  const organizationName = readOption(args, "org") ?? "Rentix";
  const password = readOption(args, "haslo") ?? generatePassword();

  const result = await registerOwner({ email, name, organizationName, password });

  if (!result.ok) {
    console.error(
      `Adres ${email} jest już zajęty. Podnieś rolę istniejącemu kontu: npm run admin:grant -- ${email}`,
    );
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "ADMIN", emailVerified: new Date() },
  });

  console.log("Konto administratora założone.\n");
  console.log(`  Login:  ${email}`);
  console.log(`  Hasło:  ${password}`);
  console.log(`  Firma:  ${organizationName}`);
  console.log("\nHasło pokazuje się wyłącznie teraz — w bazie leży sam hash bcrypta.");
  console.log("Zmienisz je w panelu: Ustawienia → Konto.");
  console.log("Panel administratora: /admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
