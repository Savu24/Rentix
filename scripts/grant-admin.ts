import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Nadanie i odebranie roli administratora platformy.
 *
 *   npm run admin:grant -- ktos@example.com
 *   npm run admin:grant -- ktos@example.com --revoke
 *
 * Skrypt, a nie ekran w panelu, bo pierwszego administratora nie ma komu nadać
 * z wnętrza aplikacji — panel wymaga administratora, żeby się otworzyć.
 * Kolejnych nadaje się już z `/admin/uzytkownicy`, ale ta droga zostaje jako
 * wyjście awaryjne, gdy ostatnie konto z uprawnieniami przepadnie.
 *
 * Rola platformy nie rusza członkostw w organizacjach: konto dalej pracuje
 * w swoim panelu na dotychczasowych prawach, dostaje tylko drugi panel obok.
 */
async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("-"))?.trim().toLowerCase();
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("Podaj adres e-mail: npm run admin:grant -- ktos@example.com [--revoke]");
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      console.error(`Nie ma konta o adresie ${email}. Najpierw je załóż.`);
      process.exitCode = 1;
      return;
    }

    /*
      Najemcy nie awansujemy. Rola TENANT rozstrzyga, do którego panelu konto
      trafia po zalogowaniu, więc podmiana odcięłaby je od własnego portalu —
      a administrator platformy i najemca to w praktyce dwie różne osoby.
    */
    if (!revoke && user.role === "TENANT") {
      console.error(
        `Konto ${email} jest najemcą. Rola administratora odcięłaby je od portalu najemcy.`,
      );
      process.exitCode = 1;
      return;
    }

    const role = revoke ? "OWNER" : "ADMIN";

    if (user.role === role) {
      console.log(`Konto ${email} już ma rolę ${role}. Nic nie zmieniam.`);
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { role } });

    console.log(`${email}: ${user.role} → ${role}.`);
    console.log(
      revoke
        ? "Panel administratora przestanie się otwierać po odświeżeniu sesji."
        : "Panel administratora czeka pod /admin. Wyloguj się i zaloguj ponownie — rola siedzi w tokenie sesji.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
