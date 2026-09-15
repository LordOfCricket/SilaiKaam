-- CreateEnum
CREATE TYPE "InspectionStage" AS ENUM ('PRE_FITTING', 'QC');

-- AlterEnum
ALTER TYPE "InspectionOutcome" ADD VALUE 'REWORK_REQUIRED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERY_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERY_RESCHEDULED';

-- AlterTable
ALTER TABLE "fitting_inspections" ADD COLUMN     "stage" "InspectionStage" NOT NULL DEFAULT 'PRE_FITTING',
ALTER COLUMN "garmentCondition" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_status_history" ADD COLUMN     "actorSource" TEXT;

