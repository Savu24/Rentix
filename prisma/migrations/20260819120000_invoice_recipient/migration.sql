-- AlterTable
-- Przelacznik wysylki per umowa. Jeden najemca prosi o papier albo rozlicza sie
-- przez zarzadce budynku, a reszta portfela ma dostawac maile normalnie —
-- ustawienie na poziomie organizacji nie potrafilo tego wyrazic.
ALTER TABLE "leases" ADD COLUMN     "sendInvoicesByEmail" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
-- Nabywca dokumentu jako relacja, nie tylko migawka w kolumnach buyer*.
-- Migawka ma sie nie zmieniac po wystawieniu i to jest poprawne dla dokumentu
-- ksiegowego, ale nie wystarcza do wysylki: adres e-mail bywa poprawiany
-- wlasnie dlatego, ze byl bledny.
ALTER TABLE "invoices" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- AddForeignKey
-- SET NULL, nie CASCADE: usuniecie kartoteki najemcy nie moze zabrac ze soba
-- wystawionych dokumentow. Dane nabywcy zostaja na fakturze w kolumnach buyer*,
-- wiec dokument pozostaje kompletny ksiegowo takze bez tej relacji.
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Uzupelnienie historii: dokumenty wystawione na umowie dostaja tego najemcu,
-- ktorego umowa wskazuje jako glownego. Bez tego istniejace faktury mialyby
-- odbiorce tylko przez umowe, a nowy kod czytalby dla nich pusta relacje.
UPDATE "invoices" AS i
SET "tenantId" = lt."tenantId"
FROM "lease_tenants" AS lt
WHERE lt."leaseId" = i."leaseId"
  AND lt."isPrimary" = true
  AND i."leaseId" IS NOT NULL
  AND i."tenantId" IS NULL;
