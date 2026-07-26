-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FIXED', 'WINDOW', 'DURATION');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "scheduleType" "ScheduleType" NOT NULL DEFAULT 'DURATION';
