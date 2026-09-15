-- Powiadomienie zna swojego najemce.
--
-- Do tej pory wiersz w "notifications" wskazywal tylko adres e-mail i dokument.
-- Karta najemcy nie miala z czego zlozyc historii "co do niego poszlo
-- i kiedy": po adresie nie, bo adres w kartotece bywa poprawiany, a po
-- dokumencie nie, bo umowe da sie przepisac na kogos innego.
--
-- Stare wiersze dostaja najemce z dokumentu, do ktorego sie odnosza: glowny
-- najemca z umowy, a gdy dokument stoi poza umowa -- nabywca z faktury.
-- Ta sama kolejnosc, co w `src/lib/invoices/recipient.ts`.

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: najemca z umowy ma pierwszenstwo.
UPDATE "notifications" n
SET "tenantId" = lt."tenantId"
FROM "invoices" i
JOIN "lease_tenants" lt ON lt."leaseId" = i."leaseId" AND lt."isPrimary" = true
WHERE n."invoiceId" = i."id" AND n."tenantId" IS NULL;

-- Backfill: dokument poza umowa -- nabywca wskazany przy wystawieniu.
UPDATE "notifications" n
SET "tenantId" = i."tenantId"
FROM "invoices" i
WHERE n."invoiceId" = i."id" AND n."tenantId" IS NULL AND i."tenantId" IS NOT NULL;
