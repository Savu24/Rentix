-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "property_owners" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "bankAccount" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_owners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_owners_organizationId_idx" ON "property_owners"("organizationId");

-- CreateIndex
CREATE INDEX "property_owners_organizationId_archivedAt_idx" ON "property_owners"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "property_owners_organizationId_name_idx" ON "property_owners"("organizationId", "name");

-- CreateIndex
CREATE INDEX "properties_ownerId_idx" ON "properties"("ownerId");

-- AddForeignKey
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "property_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
