-- AlterTable
-- Dokumenty tozsamosci najemcy. Wszystkie opcjonalne i niezalezne od siebie:
-- co okaze najemca, zalezy od niego (dowod, paszport), a PESEL bywa potrzebny
-- osobno — wchodzi do wniosku o najem okazjonalny.
ALTER TABLE "tenants" ADD COLUMN     "idCardNumber" TEXT;
ALTER TABLE "tenants" ADD COLUMN     "pesel" TEXT;
ALTER TABLE "tenants" ADD COLUMN     "passportNumber" TEXT;

-- AlterTable
-- Osoba do kontaktu w naglym wypadku. Trzy kolumny zamiast relacji: to notatka
-- na wypadek pozaru czy pogotowia, a nie kartoteka kolejnego czlowieka
-- w systemie — nie ma czego z nia laczyc ani czym rozliczac.
ALTER TABLE "tenants" ADD COLUMN     "emergencyContactFirstName" TEXT;
ALTER TABLE "tenants" ADD COLUMN     "emergencyContactLastName" TEXT;
ALTER TABLE "tenants" ADD COLUMN     "emergencyContactPhone" TEXT;
