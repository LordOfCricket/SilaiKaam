import { z } from 'zod';

// No cloud storage provider exists yet — photos are stored inline as
// base64, so the cap keeps rows small and uploads fast on a typical
// connection. 3MB raw (~4MB base64) is enough for a phone photo at
// reasonable compression.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const garmentConditionSchema = z.enum(['NEW', 'GOOD', 'WORN', 'DAMAGED']);
export const garmentPhotoRoleSchema = z.enum(['FRONT', 'BACK', 'AREA', 'DAMAGE']);

export const existingGarmentRequestSchema = z.object({
  garmentType: z.string().trim().min(2, 'Garment type is required.').max(60),
  brand: z.string().trim().max(60).optional().or(z.literal('')),
  currentSize: z.string().trim().max(20).optional().or(z.literal('')),
  condition: garmentConditionSchema,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  fitProfileId: z.string().uuid().optional(),
  selectedFittingServiceIds: z
    .array(z.string().uuid())
    .min(1, 'Select at least one fitting service.'),
});

export type ExistingGarmentRequestInput = z.infer<typeof existingGarmentRequestSchema>;

export const customStitchingRequestSchema = z.object({
  garmentType: z.string().trim().min(2, 'Garment type is required.').max(60),
  fabricDetails: z.string().trim().max(200).optional().or(z.literal('')),
  designDetails: z.string().trim().max(500).optional().or(z.literal('')),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  specialRequirements: z.string().trim().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  fitProfileId: z.string().uuid().optional(),
});

export type CustomStitchingRequestInput = z.infer<typeof customStitchingRequestSchema>;
