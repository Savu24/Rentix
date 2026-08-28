-- AlterTable
-- Konta zwolnione z oplat (wlasna firma, demo, partnerzy). Plan mowi, co konto
-- moze robic; ta flaga — czy operator platnosci ma je w ogole rozliczac.
-- DEFAULT false, wiec istniejace subskrypcje pozostaja platne.
ALTER TABLE "subscriptions" ADD COLUMN "billingExempt" BOOLEAN NOT NULL DEFAULT false;
