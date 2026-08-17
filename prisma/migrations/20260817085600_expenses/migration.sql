-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MORTGAGE', 'COMMUNITY_FEE', 'UTILITIES', 'REPAIR', 'FURNISHING', 'INSURANCE', 'PROPERTY_TAX', 'INCOME_TAX', 'MANAGEMENT', 'ACCOUNTING', 'LEGAL', 'OTHER');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amountGrosze" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "documentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_organizationId_idx" ON "expenses"("organizationId");

-- CreateIndex
CREATE INDEX "expenses_organizationId_paidAt_idx" ON "expenses"("organizationId", "paidAt");

-- CreateIndex
CREATE INDEX "expenses_organizationId_category_idx" ON "expenses"("organizationId", "category");

-- CreateIndex
CREATE INDEX "expenses_propertyId_idx" ON "expenses"("propertyId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
