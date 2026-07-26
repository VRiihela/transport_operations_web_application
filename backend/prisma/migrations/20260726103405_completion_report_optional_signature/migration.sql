-- AlterEnum
ALTER TYPE "AuditEvent" ADD VALUE 'COMPLETION_REPORT_APPROVED_WITHOUT_SIGNATURE';

-- AlterTable
ALTER TABLE "completion_reports" ADD COLUMN     "noSignatureReason" TEXT,
ALTER COLUMN "customerSignature" DROP NOT NULL;
