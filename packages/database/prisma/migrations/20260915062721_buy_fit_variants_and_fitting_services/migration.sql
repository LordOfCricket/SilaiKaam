-- CreateEnum
CREATE TYPE "FittingServiceType" AS ENUM ('SLEEVE_ALTERATION', 'LENGTH_ALTERATION', 'WAIST_ALTERATION', 'CHEST_ALTERATION', 'SHOULDER_ALTERATION', 'TAPERING');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isFittingEligible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "price" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_services" (
    "id" TEXT NOT NULL,
    "type" "FittingServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredMeasurements" "MeasurementKey"[],
    "basePrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitting_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_service_categories" (
    "id" TEXT NOT NULL,
    "fittingServiceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "fitting_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_size_color_key" ON "product_variants"("productId", "size", "color");

-- CreateIndex
CREATE UNIQUE INDEX "fitting_services_type_key" ON "fitting_services"("type");

-- CreateIndex
CREATE UNIQUE INDEX "fitting_service_categories_fittingServiceId_categoryId_key" ON "fitting_service_categories"("fittingServiceId", "categoryId");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_service_categories" ADD CONSTRAINT "fitting_service_categories_fittingServiceId_fkey" FOREIGN KEY ("fittingServiceId") REFERENCES "fitting_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_service_categories" ADD CONSTRAINT "fitting_service_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
