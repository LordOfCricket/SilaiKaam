import { z } from 'zod';

// V1 supports inches only — a fixed unit keeps the range checks meaningful
// without unit-conversion logic; extend when a second unit is needed.
export const MEASUREMENT_UNIT = 'in';
export const MEASUREMENT_MIN = 1;
export const MEASUREMENT_MAX = 100;

export const measurementKeySchema = z.enum([
  'CHEST',
  'WAIST',
  'SHOULDER',
  'SLEEVE',
  'ARMHOLE',
  'SHIRT_LENGTH',
  'TROUSER_WAIST',
  'HIP',
  'INSEAM',
  'OUTSEAM',
  'THIGH',
  'KNEE',
]);

export const fitPreferenceSchema = z.enum(['SLIM', 'REGULAR', 'RELAXED', 'CUSTOM']);

export const measurementValueSchema = z
  .number({ invalid_type_error: 'Enter a number.' })
  .positive('Measurement must be greater than 0.')
  .min(MEASUREMENT_MIN, `Measurement must be at least ${MEASUREMENT_MIN} inch.`)
  .max(MEASUREMENT_MAX, `Measurement must be at most ${MEASUREMENT_MAX} inches.`);

export const fitProfileSchema = z.object({
  label: z.string().trim().min(2, 'Give this profile a name.').max(60),
  fitPreference: fitPreferenceSchema,
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be at most 500 characters.')
    .optional()
    .or(z.literal('')),
  measurements: z.record(measurementKeySchema, measurementValueSchema.optional()).default({}),
});

export type FitProfileFormInput = z.infer<typeof fitProfileSchema>;
