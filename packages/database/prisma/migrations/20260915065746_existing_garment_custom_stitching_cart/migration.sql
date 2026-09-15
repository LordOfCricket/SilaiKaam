-- CreateEnum
CREATE TYPE "GarmentCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'DAMAGED');

-- CreateEnum
CREATE TYPE "GarmentPhotoRole" AS ENUM ('FRONT', 'BACK', 'AREA', 'DAMAGE');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('PRODUCT_ONLY', 'BUY_FIT', 'EXISTING_GARMENT', 'CUSTOM_STITCHING');

-- CreateTable
CREATE TABLE "existing_garment_requests" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "garmentType" TEXT NOT NULL,
    "brand" TEXT,
    "currentSize" TEXT,
    "condition" "GarmentCondition" NOT NULL,
    "notes" TEXT,
    "fitProfileId" TEXT,
    "selectedFittingServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "existing_garment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_photos" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "role" "GarmentPhotoRole" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_stitching_requests" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "garmentType" TEXT NOT NULL,
    "fabricDetails" TEXT,
    "designDetails" TEXT,
    "color" TEXT,
    "specialRequirements" TEXT,
    "notes" TEXT,
    "fitProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_stitching_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_stitching_reference_images" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_stitching_reference_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "type" "CartItemType" NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "quantity" INTEGER,
    "fitProfileId" TEXT,
    "selectedFittingServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "existingGarmentRequestId" TEXT,
    "customStitchingRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "existing_garment_requests_customerProfileId_idx" ON "existing_garment_requests"("customerProfileId");

-- CreateIndex
CREATE INDEX "custom_stitching_requests_customerProfileId_idx" ON "custom_stitching_requests"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customerProfileId_key" ON "carts"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_existingGarmentRequestId_key" ON "cart_items"("existingGarmentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_customStitchingRequestId_key" ON "cart_items"("customStitchingRequestId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- AddForeignKey
ALTER TABLE "existing_garment_requests" ADD CONSTRAINT "existing_garment_requests_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "fit_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_photos" ADD CONSTRAINT "garment_photos_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "existing_garment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_stitching_requests" ADD CONSTRAINT "custom_stitching_requests_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "fit_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_stitching_reference_images" ADD CONSTRAINT "custom_stitching_reference_images_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "custom_stitching_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "fit_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_existingGarmentRequestId_fkey" FOREIGN KEY ("existingGarmentRequestId") REFERENCES "existing_garment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_customStitchingRequestId_fkey" FOREIGN KEY ("customStitchingRequestId") REFERENCES "custom_stitching_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
