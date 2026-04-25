-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "city" VARCHAR(255),
ADD COLUMN     "deliveryCity" VARCHAR(255),
ADD COLUMN     "deliveryHouseNumber" VARCHAR(50),
ADD COLUMN     "deliveryPostalCode" VARCHAR(20),
ADD COLUMN     "deliveryStair" VARCHAR(50),
ADD COLUMN     "deliveryStreet" VARCHAR(255),
ADD COLUMN     "houseNumber" VARCHAR(50),
ADD COLUMN     "postalCode" VARCHAR(20),
ADD COLUMN     "stair" VARCHAR(50),
ADD COLUMN     "street" VARCHAR(255);
