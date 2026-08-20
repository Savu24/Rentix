-- AlterTable
-- Okres umowy o zarzadzanie zawartej z wlascicielem — nie mylic z umowa najmu,
-- ktora podpisuje najemca (tabela "leases"). Obie kolumny nullable: wlasciciela
-- wpisuje sie czesto zanim umowa zostanie podpisana, a NULL w dacie konca
-- znaczy czas nieokreslony.
ALTER TABLE "property_owners" ADD COLUMN     "contractStartDate" TIMESTAMP(3);
ALTER TABLE "property_owners" ADD COLUMN     "contractEndDate" TIMESTAMP(3);
