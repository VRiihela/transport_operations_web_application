-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledStart" TIMESTAMP(3),
ADD COLUMN     "schedulingNote" TEXT;
