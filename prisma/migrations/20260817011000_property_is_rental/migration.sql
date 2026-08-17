-- Nieruchomość staje się przedmiotem najmu; warstwa `units` znika.
--
-- Migracja jest napisana ręcznie, bo Prisma zaproponowałaby DROP TABLE "units"
-- razem z kolumnami, które trzeba najpierw PRZENIEŚĆ na nieruchomości.
-- Kolejność: dodaj nowe kolumny → przepisz dane → przepnij klucze obce →
-- dopiero potem usuwaj.
--
-- Założenie sprawdzone na danych przed migracją: każda nieruchomość ma
-- najwyżej jedną jednostkę. Gdyby miała więcej, poniższe `SELECT ... LIMIT 1`
-- wzięłoby pierwszą — dlatego blok na końcu przerywa migrację, jeśli
-- założenie nie jest spełnione.

-- ── 0. Zabezpieczenie: przerwij, jeśli któraś nieruchomość ma >1 jednostkę ──
DO $$
DECLARE offending INT;
BEGIN
  SELECT COUNT(*) INTO offending FROM (
    SELECT "propertyId" FROM "units" GROUP BY "propertyId" HAVING COUNT(*) > 1
  ) t;
  IF offending > 0 THEN
    RAISE EXCEPTION 'Migracja przerwana: % nieruchomości ma więcej niż jedną jednostkę. Scal je ręcznie przed migracją.', offending;
  END IF;
END $$;

-- ── 1. Nowy enum statusu ──────────────────────────────────────────────────
ALTER TYPE "UnitStatus" RENAME TO "RentalStatus";

-- ── 2. Nowe kolumny na nieruchomości ──────────────────────────────────────
ALTER TABLE "properties"
  ADD COLUMN "status" "RentalStatus" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "areaM2" DECIMAL(8,2),
  ADD COLUMN "floor" INTEGER,
  ADD COLUMN "askingRentGrosze" INTEGER;

-- Przeniesienie danych z jedynej jednostki każdej nieruchomości.
UPDATE "properties" p
SET "status" = u."status",
    "areaM2" = u."areaM2",
    "floor" = u."floor",
    "askingRentGrosze" = u."askingRentGrosze"
FROM "units" u
WHERE u."propertyId" = p."id";

-- Deklarowana liczba pokoi przestaje być osobnym polem — wynika z rekordów
-- `rooms`, które od teraz powstają automatycznie.
ALTER TABLE "properties" DROP COLUMN "rooms";

-- ── 3. Pokoje przypinamy do nieruchomości ─────────────────────────────────
ALTER TABLE "rooms"
  ADD COLUMN "propertyId" TEXT,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "rooms" r SET "propertyId" = u."propertyId" FROM "units" u WHERE r."unitId" = u."id";

ALTER TABLE "rooms" ALTER COLUMN "propertyId" SET NOT NULL;

DROP INDEX IF EXISTS "rooms_unitId_name_key";
DROP INDEX IF EXISTS "rooms_unitId_status_idx";
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_unitId_fkey";
ALTER TABLE "rooms" DROP COLUMN "unitId";

CREATE UNIQUE INDEX "rooms_propertyId_name_key" ON "rooms"("propertyId", "name");
CREATE INDEX "rooms_propertyId_position_idx" ON "rooms"("propertyId", "position");
CREATE INDEX "rooms_propertyId_status_idx" ON "rooms"("propertyId", "status");
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. Umowy wskazują nieruchomość ────────────────────────────────────────
ALTER TABLE "leases" ADD COLUMN "propertyId" TEXT;
UPDATE "leases" l SET "propertyId" = u."propertyId" FROM "units" u WHERE l."unitId" = u."id";
ALTER TABLE "leases" ALTER COLUMN "propertyId" SET NOT NULL;

DROP INDEX IF EXISTS "leases_unitId_idx";
ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "leases_unitId_fkey";
ALTER TABLE "leases" DROP COLUMN "unitId";

CREATE INDEX "leases_propertyId_idx" ON "leases"("propertyId");
ALTER TABLE "leases" ADD CONSTRAINT "leases_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── 5. Odczyty liczników ──────────────────────────────────────────────────
ALTER TABLE "meter_readings"
  ADD COLUMN "propertyId" TEXT,
  ADD COLUMN "roomId" TEXT;

UPDATE "meter_readings" m SET "propertyId" = u."propertyId" FROM "units" u WHERE m."unitId" = u."id";
ALTER TABLE "meter_readings" ALTER COLUMN "propertyId" SET NOT NULL;

DROP INDEX IF EXISTS "meter_readings_unitId_meterType_readAt_idx";
ALTER TABLE "meter_readings" DROP CONSTRAINT IF EXISTS "meter_readings_unitId_fkey";
ALTER TABLE "meter_readings" DROP COLUMN "unitId";

CREATE INDEX "meter_readings_propertyId_meterType_readAt_idx"
  ON "meter_readings"("propertyId", "meterType", "readAt");
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 6. Zgłoszenia usterek ─────────────────────────────────────────────────
-- `propertyId` już było; zamieniamy tylko `unitId` na `roomId`.
ALTER TABLE "maintenance_requests" ADD COLUMN "roomId" TEXT;

DROP INDEX IF EXISTS "maintenance_requests_unitId_idx";
ALTER TABLE "maintenance_requests" DROP CONSTRAINT IF EXISTS "maintenance_requests_unitId_fkey";
ALTER TABLE "maintenance_requests" DROP COLUMN "unitId";

CREATE INDEX "maintenance_requests_roomId_idx" ON "maintenance_requests"("roomId");
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 7. Dokumenty ──────────────────────────────────────────────────────────
ALTER TABLE "documents" ADD COLUMN "roomId" TEXT;
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_unitId_fkey";
ALTER TABLE "documents" DROP COLUMN "unitId";

-- ── 8. Nowy indeks statusu na nieruchomości ───────────────────────────────
CREATE INDEX "properties_organizationId_status_idx" ON "properties"("organizationId", "status");

-- ── 9. Koniec warstwy jednostek ───────────────────────────────────────────
DROP TABLE "units";
