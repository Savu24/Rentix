-- Wzor numeru dokumentu wybierany w ustawieniach organizacji.
--
-- NULL = wzor domyslny (numer/miesiac/rok), czyli dokladnie to, co bylo
-- do tej pory -- zadne konto nie zmienia numeracji przez sama migracje.
-- Dokumenty juz wystawione zostaja przy swoich numerach; wzor dziala tylko
-- przy nadawaniu kolejnych.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "invoiceNumberFormat" TEXT;
