-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leases_organizationId_archivedAt_idx" ON "leases"("organizationId", "archivedAt");
