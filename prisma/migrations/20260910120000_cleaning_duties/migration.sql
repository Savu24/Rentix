-- Harmonogram sprzatania czesci wspolnych.
--
-- Wiersz na tydzien, a nie dokument na miesiac: miesiac jest tylko zakresem
-- dat w zapytaniu. Dzieki temu wygenerowanie kolejnego miesiaca widzi ostatni
-- dyzur poprzedniego jednym SELECT-em i nie stawia tego samego pokoju dwa
-- tygodnie z rzedu -- a to jedyna regula, o ktora w tej tabelce chodzi.
--
-- "label" duplikuje nazwe pokoju swiadomie: harmonogram wisi wydrukowany na
-- lodowce, wiec skasowany pokoj nie ma zostawiac w nim pustej kratki. Stad
-- tez SET NULL na obu kluczach obcych zamiast RESTRICT.

-- CreateTable
CREATE TABLE "cleaning_duties" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT,
    "tenantId" TEXT,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_duties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cleaning_duties_organizationId_idx" ON "cleaning_duties"("organizationId");

-- CreateIndex
CREATE INDEX "cleaning_duties_propertyId_startsOn_idx" ON "cleaning_duties"("propertyId", "startsOn");

-- CreateIndex
-- Jeden dyzur na tydzien: powtorne generowanie miesiaca nadpisuje wiersze,
-- a nie doklada drugiego zestawu obok pierwszego.
CREATE UNIQUE INDEX "cleaning_duties_propertyId_startsOn_key" ON "cleaning_duties"("propertyId", "startsOn");

-- AddForeignKey
ALTER TABLE "cleaning_duties" ADD CONSTRAINT "cleaning_duties_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_duties" ADD CONSTRAINT "cleaning_duties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_duties" ADD CONSTRAINT "cleaning_duties_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_duties" ADD CONSTRAINT "cleaning_duties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
