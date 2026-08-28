-- AlterTable
-- Karta pobytu — dokument cudzoziemca mieszkajacego w Polsce na stale.
-- Osobna kolumna obok paszportu, bo najemca okazuje zwykle oba naraz.
ALTER TABLE "tenants" ADD COLUMN "residenceCardNumber" TEXT;

-- AlterTable
-- E-mail do osoby kontaktowej na wypadek naglego zdarzenia. Sam telefon
-- nie wystarcza, gdy nikt nie odbiera — do wiadomosci mozna wrocic pozniej.
ALTER TABLE "tenants" ADD COLUMN "emergencyContactEmail" TEXT;
