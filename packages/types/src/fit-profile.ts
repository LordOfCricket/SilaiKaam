// Fit Profile domain types shared across services and the web app.

export const MEASUREMENT_KEYS = [
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
] as const;

export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export const FIT_PREFERENCES = ['SLIM', 'REGULAR', 'RELAXED', 'CUSTOM'] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export interface MeasurementDto {
  key: MeasurementKey;
  value: number;
  unit: string;
}

export interface FitProfileDto {
  id: string;
  label: string;
  fitPreference: FitPreference;
  notes: string | null;
  measurements: MeasurementDto[];
  createdAt: string;
  updatedAt: string;
}
