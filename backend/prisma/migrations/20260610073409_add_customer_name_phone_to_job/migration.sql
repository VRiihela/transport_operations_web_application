-- AlterEnum
ALTER TYPE "AuditEvent" ADD VALUE 'COMPLETION_REPORT_UNLOCKED';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "customerName" VARCHAR(255),
ADD COLUMN     "customerPhone" VARCHAR(50);
