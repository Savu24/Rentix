-- AlterTable
-- Rachunek wystawcy, na ktory najemcy maja wplacac czynsz. Trafia na dokument
-- rozliczeniowy jako konto do przelewu.
-- 26 cyfr bez spacji i bez prefiksu „PL" — normalizuje walidacja, zeby ten sam
-- numer nie lezal w bazie w trzech zapisach.
-- NULL (domyslnie) = dokument bez informacji o platnosci, czyli zachowanie
-- sprzed tej zmiany.
ALTER TABLE "organizations" ADD COLUMN "bankAccount" TEXT;
