-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('DELIVERY', 'PICKUP', 'DELIVERY_AND_PICKUP', 'INSTALLATION', 'SERVICE', 'COMBINED');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "accessNotes" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "doorCode" TEXT,
ADD COLUMN     "floorStair" TEXT,
ADD COLUMN     "jobType" "JobType" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "pickupCity" TEXT,
ADD COLUMN     "pickupPostalCode" TEXT,
ADD COLUMN     "pickupStreet" TEXT,
ADD COLUMN     "services" TEXT;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
