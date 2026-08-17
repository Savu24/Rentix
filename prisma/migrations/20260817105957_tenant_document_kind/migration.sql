-- AlterEnum
ALTER TYPE "InvoiceKind" ADD VALUE 'CHARGE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "documentKind" "InvoiceKind" NOT NULL DEFAULT 'BILL';
