-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedDriverId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "location" VARCHAR(255),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_assignedDriverId_idx" ON "jobs"("assignedDriverId");

-- CreateIndex
CREATE INDEX "jobs_createdById_idx" ON "jobs"("createdById");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
