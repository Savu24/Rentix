-- CreateEnum
-- Rodzaj ogrzewania — pierwsze pytanie najemcy ogladajacego mieszkanie zima.
CREATE TYPE "HeatingType" AS ENUM ('DISTRICT', 'GAS', 'ELECTRIC', 'HEAT_PUMP', 'SOLID_FUEL', 'OTHER');

-- CreateEnum
-- Kim jest najemca na dokumencie sprzedazy. Nie dubluje "documentKind":
-- tamto mowi, JAKI dokument wystawiamy, a to — KOGO na nim wpisujemy.
CREATE TYPE "TenantLegalForm" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
-- Dostep do lokalu: drobiazgi przekazywane przy wydaniu kluczy, ktorych potem
-- szuka sie po mailach sprzed roku. Godzina zdania lokalu jako TEXT (HH:MM) —
-- to pora dnia bez daty, wiec TIMESTAMP kazalby doklejac sztuczny dzien.
ALTER TABLE "properties" ADD COLUMN "intercomCode" TEXT;
ALTER TABLE "properties" ADD COLUMN "checkoutTime" TEXT;
ALTER TABLE "properties" ADD COLUMN "storageUnit" TEXT;
ALTER TABLE "properties" ADD COLUMN "bikeStorage" TEXT;
ALTER TABLE "properties" ADD COLUMN "wasteDisposal" TEXT;

-- AlterTable
-- Administracja budynku — wspolnota albo spoldzielnia. To NIE jest
-- "property_owners": wlasciciel jest strona naszej umowy, a administracja to
-- numer, pod ktory dzwoni sie przy zalaniu.
ALTER TABLE "properties" ADD COLUMN "buildingManagerName" TEXT;
ALTER TABLE "properties" ADD COLUMN "buildingManagerAddress" TEXT;
ALTER TABLE "properties" ADD COLUMN "buildingManagerPhone" TEXT;
ALTER TABLE "properties" ADD COLUMN "buildingManagerEmail" TEXT;

-- AlterTable
-- Media i internet. Haslo do Wi-Fi lezy jawnie i tak ma byc: przepisuje sie je
-- najemcy przy wydaniu kluczy, a karta nieruchomosci jest widoczna wylacznie
-- dla wlasciciela.
ALTER TABLE "properties" ADD COLUMN "heatingType" "HeatingType";
ALTER TABLE "properties" ADD COLUMN "internetProvider" TEXT;
ALTER TABLE "properties" ADD COLUMN "internetProviderPhone" TEXT;
ALTER TABLE "properties" ADD COLUMN "internetSpeedMbps" INTEGER;
ALTER TABLE "properties" ADD COLUMN "wifiSsid" TEXT;
ALTER TABLE "properties" ADD COLUMN "wifiPassword" TEXT;
ALTER TABLE "properties" ADD COLUMN "internetContractEndsAt" TIMESTAMP(3);

-- AlterTable
-- Przeglady i dokumenty. Ze swiadectwa energetycznego trzymamy sam wskaznik
-- EP — to jedyny, ktory podaje sie w ogloszeniu najmu.
ALTER TABLE "properties" ADD COLUMN "landRegistryNumber" TEXT;
ALTER TABLE "properties" ADD COLUMN "energyCertificateEp" DECIMAL(8,2);
ALTER TABLE "properties" ADD COLUMN "energyCertificateExpiresAt" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN "boilerModel" TEXT;
ALTER TABLE "properties" ADD COLUMN "boilerInspectionAt" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN "technicalInspectionAt" TIMESTAMP(3);

-- AlterTable
-- Okolica i dojazd. Wspolrzedne w jednej kolumnie, bo kopiuje sie je z map
-- jednym ruchem; odleglosci w metrach.
ALTER TABLE "properties" ADD COLUMN "gpsCoordinates" TEXT;
ALTER TABLE "properties" ADD COLUMN "transitLines" TEXT;
ALTER TABLE "properties" ADD COLUMN "transitStopDistanceM" INTEGER;
ALTER TABLE "properties" ADD COLUMN "universityDistanceM" INTEGER;
ALTER TABLE "properties" ADD COLUMN "nearbyPlaces" TEXT;

-- AlterTable
-- Forma prawna z wartoscia domyslna: istniejacy najemcy to osoby fizyczne,
-- bo do tej pory firma nie miala jak sie w kartotece pojawic.
ALTER TABLE "tenants" ADD COLUMN "legalForm" "TenantLegalForm" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "tenants" ADD COLUMN "dateOfBirth" TIMESTAMP(3);

-- AlterTable
-- Adres zameldowania — inny niz korespondencyjny. Wchodzi do umowy najmu
-- okazjonalnego: to adres, pod ktory najemca wroci po zakonczeniu najmu.
-- NULL w "registeredUntil" = zameldowanie bezterminowe.
ALTER TABLE "tenants" ADD COLUMN "registeredStreet" TEXT;
ALTER TABLE "tenants" ADD COLUMN "registeredPostalCode" TEXT;
ALTER TABLE "tenants" ADD COLUMN "registeredCity" TEXT;
ALTER TABLE "tenants" ADD COLUMN "registeredUntil" TIMESTAMP(3);

-- AlterTable
-- Kontakt do platnosci, gdy inny niz podstawowy (placi rodzic albo ksiegowosc),
-- oraz rachunek do zwrotu kaucji.
ALTER TABLE "tenants" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "tenants" ADD COLUMN "billingPhone" TEXT;
ALTER TABLE "tenants" ADD COLUMN "depositRefundAccount" TEXT;

-- AlterTable
-- Praca albo studia: z czego ten najemca zaplaci i do kiedy to trwa.
ALTER TABLE "tenants" ADD COLUMN "employerName" TEXT;
ALTER TABLE "tenants" ADD COLUMN "employmentUntil" TIMESTAMP(3);

-- AlterTable
-- Polisa OC najemcy. Numeru nie sprawdzamy wzorem — kazdy ubezpieczyciel
-- numeruje po swojemu.
ALTER TABLE "tenants" ADD COLUMN "insurerName" TEXT;
ALTER TABLE "tenants" ADD COLUMN "insurancePolicyNumber" TEXT;
ALTER TABLE "tenants" ADD COLUMN "insuranceExpiresAt" TIMESTAMP(3);
