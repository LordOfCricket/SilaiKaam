import { apiClient } from '@/lib/api-client';
import type { FitPreference, FitProfileDto, MeasurementKey } from '@silaikaam/types';

export interface UpsertFitProfilePayload {
  label: string;
  fitPreference: FitPreference;
  notes?: string;
  measurements: { key: MeasurementKey; value: number }[];
}

export const fitProfileApi = {
  get: () => apiClient.get<FitProfileDto | null>('/fit-profile'),
  upsert: (payload: UpsertFitProfilePayload) =>
    apiClient.put<FitProfileDto>('/fit-profile', payload),
};
