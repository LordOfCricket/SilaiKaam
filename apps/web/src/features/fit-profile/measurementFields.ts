import type { MeasurementKey } from '@silaikaam/types';

interface MeasurementFieldConfig {
  key: MeasurementKey;
  label: string;
}

export const UPPER_BODY_FIELDS: MeasurementFieldConfig[] = [
  { key: 'CHEST', label: 'Chest' },
  { key: 'SHOULDER', label: 'Shoulder' },
  { key: 'SLEEVE', label: 'Sleeve' },
  { key: 'ARMHOLE', label: 'Armhole' },
  { key: 'SHIRT_LENGTH', label: 'Shirt length' },
];

export const LOWER_BODY_FIELDS: MeasurementFieldConfig[] = [
  { key: 'WAIST', label: 'Waist' },
  { key: 'TROUSER_WAIST', label: 'Trouser waist' },
  { key: 'HIP', label: 'Hip' },
  { key: 'INSEAM', label: 'Inseam' },
  { key: 'OUTSEAM', label: 'Outseam' },
  { key: 'THIGH', label: 'Thigh' },
  { key: 'KNEE', label: 'Knee' },
];

export const FIT_PREFERENCE_OPTIONS = [
  { value: 'SLIM', label: 'Slim' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'RELAXED', label: 'Relaxed' },
  { value: 'CUSTOM', label: 'Custom' },
];
