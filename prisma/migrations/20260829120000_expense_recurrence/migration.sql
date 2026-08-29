-- CreateEnum
-- Jak czesto wraca ten sam koszt. CUSTOM = wlasny odstep w dniach.
CREATE TYPE "ExpenseRecurrence" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- AlterTable
-- NULL w "recurrence" = koszt jednorazowy, czyli zachowanie sprzed tej zmiany.
-- Istniejace wiersze zostaja jednorazowe i nic im sie nie nalicza.
ALTER TABLE "expenses" ADD COLUMN "recurrence" "ExpenseRecurrence";
ALTER TABLE "expenses" ADD COLUMN "recurrenceEveryDays" INTEGER;
ALTER TABLE "expenses" ADD COLUMN "recurrenceNextAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN "recurringFromId" TEXT;

-- CreateIndex
CREATE INDEX "expenses_organizationId_recurrenceNextAt_idx" ON "expenses"("organizationId", "recurrenceNextAt");

-- CreateIndex
CREATE INDEX "expenses_recurringFromId_idx" ON "expenses"("recurringFromId");

-- AddForeignKey
-- SetNull: skasowanie wzorca zatrzymuje naliczanie, ale nie kasuje kosztow,
-- ktore juz poszly z konta.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurringFromId_fkey" FOREIGN KEY ("recurringFromId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
