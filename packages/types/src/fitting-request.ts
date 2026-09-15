// Existing Garment Fitting + Custom Stitching request domain types.

export const GARMENT_CONDITIONS = ['NEW', 'GOOD', 'WORN', 'DAMAGED'] as const;
export type GarmentCondition = (typeof GARMENT_CONDITIONS)[number];

export const GARMENT_PHOTO_ROLES = ['FRONT', 'BACK', 'AREA', 'DAMAGE'] as const;
export type GarmentPhotoRole = (typeof GARMENT_PHOTO_ROLES)[number];

export interface GarmentPhotoDto {
  id: string;
  role: GarmentPhotoRole;
  mimeType: string;
  sizeBytes: number;
}

export interface ExistingGarmentRequestDto {
  id: string;
  garmentType: string;
  brand: string | null;
  currentSize: string | null;
  condition: GarmentCondition;
  notes: string | null;
  fitProfileId: string | null;
  selectedFittingServiceIds: string[];
  photos: GarmentPhotoDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomStitchingReferenceImageDto {
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CustomStitchingRequestDto {
  id: string;
  garmentType: string;
  fabricDetails: string | null;
  designDetails: string | null;
  color: string | null;
  specialRequirements: string | null;
  notes: string | null;
  fitProfileId: string | null;
  referenceImages: CustomStitchingReferenceImageDto[];
  /** Always true in V1 — there is no quote/pricing workflow yet. */
  quoteRequired: true;
  createdAt: string;
  updatedAt: string;
}
