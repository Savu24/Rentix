-- Pokoje jako osobny przedmiot najmu.
--
-- UWAGA: skalarne `units.rooms` (liczba pokoi) kolidowało nazwą z nową relacją
-- `Unit.rooms -> Room[]`, więc zmienia nazwę na `roomCount`. Robimy to przez
-- RENAME, a nie DROP + ADD, którym Prisma zaproponowała ten sam efekt —
-- DROP skasowałby liczby pokoi we wszystkich istniejących jednostkach.

-- AlterTable: deklarowana liczba pokoi na poziomie nieruchomości
ALTER TABLE "properties" ADD COLUMN "rooms" INTEGER;

-- AlterTable: rename bez utraty danych
ALTER TABLE "units" RENAME COLUMN "rooms" TO "roomCount";

-- AlterTable: umowa może wskazywać pokój zamiast całego mieszkania
ALTER TABLE "leases" ADD COLUMN "roomId" TEXT;

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "monthlyRentGrosze" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_organizationId_idx" ON "rooms"("organizationId");

-- CreateIndex
CREATE INDEX "rooms_unitId_status_idx" ON "rooms"("unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_unitId_name_key" ON "rooms"("unitId", "name");

-- CreateIndex
CREATE INDEX "leases_roomId_idx" ON "leases"("roomId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
