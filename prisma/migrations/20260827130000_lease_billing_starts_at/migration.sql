-- AlterTable
-- Data, przed ktora nie naliczamy nic z tej umowy — dla umow przeniesionych
-- z innego programu, gdzie starsze miesiace maja juz dokumenty poza Rentiksem.
-- NULL (domyslnie) = naliczaj od poczatku, czyli zachowanie sprzed tej zmiany.
ALTER TABLE "leases" ADD COLUMN "billingStartsAt" TIMESTAMP(3);
