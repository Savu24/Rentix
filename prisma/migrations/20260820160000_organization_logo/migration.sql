-- CreateTable
-- Logo wystawcy drukowane na dokumentach. Osobna tabela, a nie kolumna
-- w "organizations": obrazek wazy setki kilobajtow, a Prisma przy
-- `organization: true` pobiera wszystkie kolumny naraz — trzymany obok nazwy
-- i NIP-u dokladalby ten balast kazdemu zapytaniu, ktore o logo nie prosi.
CREATE TABLE "organization_logos" (
    "organizationId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_logos_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
-- CASCADE: logo bez organizacji nie ma sensu, a usuwanie konta idzie tabela
-- po tabeli i nie musi pamietac o kolejnym wierszu do sprzatniecia.
ALTER TABLE "organization_logos" ADD CONSTRAINT "organization_logos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
