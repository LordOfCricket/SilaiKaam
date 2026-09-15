-- CreateEnum
CREATE TYPE "FittingWorkflowStatus" AS ENUM ('RECEIVED', 'INSPECTION', 'ACTION_REQUIRED', 'ASSIGNED', 'IN_PROGRESS', 'QC', 'REWORK_REQUIRED', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('PASS', 'ACTION_REQUIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActionRequestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GarmentPhotoRole" ADD VALUE 'READY_PROOF';
ALTER TYPE "GarmentPhotoRole" ADD VALUE 'ACTION_RESPONSE';

-- AlterTable
ALTER TABLE "garment_photos" ADD COLUMN     "fittingWorkflowId" TEXT,
ALTER COLUMN "requestId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "fitting_workflows" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "itemType" "OrderItemType" NOT NULL,
    "status" "FittingWorkflowStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitting_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_status_history" (
    "id" TEXT NOT NULL,
    "fittingWorkflowId" TEXT NOT NULL,
    "status" "FittingWorkflowStatus" NOT NULL,
    "customerMessage" TEXT,
    "actorSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitting_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_inspections" (
    "id" TEXT NOT NULL,
    "fittingWorkflowId" TEXT NOT NULL,
    "outcome" "InspectionOutcome" NOT NULL,
    "garmentCondition" "GarmentCondition" NOT NULL,
    "observations" TEXT,
    "issues" TEXT,
    "requiresCustomerAction" BOOLEAN NOT NULL DEFAULT false,
    "actorSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitting_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_action_requests" (
    "id" TEXT NOT NULL,
    "fittingWorkflowId" TEXT NOT NULL,
    "status" "ActionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedInfo" TEXT NOT NULL,
    "customerResponseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitting_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fitting_workflows_orderItemId_key" ON "fitting_workflows"("orderItemId");

-- CreateIndex
CREATE INDEX "fitting_workflows_orderId_idx" ON "fitting_workflows"("orderId");

-- CreateIndex
CREATE INDEX "fitting_workflows_customerProfileId_idx" ON "fitting_workflows"("customerProfileId");

-- CreateIndex
CREATE INDEX "fitting_status_history_fittingWorkflowId_idx" ON "fitting_status_history"("fittingWorkflowId");

-- CreateIndex
CREATE INDEX "fitting_inspections_fittingWorkflowId_idx" ON "fitting_inspections"("fittingWorkflowId");

-- CreateIndex
CREATE INDEX "fitting_action_requests_fittingWorkflowId_idx" ON "fitting_action_requests"("fittingWorkflowId");

-- CreateIndex
CREATE INDEX "fitting_action_requests_status_idx" ON "fitting_action_requests"("status");

-- CreateIndex
CREATE INDEX "garment_photos_fittingWorkflowId_idx" ON "garment_photos"("fittingWorkflowId");

-- AddForeignKey
ALTER TABLE "garment_photos" ADD CONSTRAINT "garment_photos_fittingWorkflowId_fkey" FOREIGN KEY ("fittingWorkflowId") REFERENCES "fitting_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_workflows" ADD CONSTRAINT "fitting_workflows_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_status_history" ADD CONSTRAINT "fitting_status_history_fittingWorkflowId_fkey" FOREIGN KEY ("fittingWorkflowId") REFERENCES "fitting_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_inspections" ADD CONSTRAINT "fitting_inspections_fittingWorkflowId_fkey" FOREIGN KEY ("fittingWorkflowId") REFERENCES "fitting_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_action_requests" ADD CONSTRAINT "fitting_action_requests_fittingWorkflowId_fkey" FOREIGN KEY ("fittingWorkflowId") REFERENCES "fitting_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

