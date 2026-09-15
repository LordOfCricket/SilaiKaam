import { apiClient } from '@/lib/api-client';
import type { CustomStitchingRequestDto } from '@silaikaam/types';

export interface ReferenceImagePayload {
  mimeType: string;
  dataBase64: string;
}

export interface CreateCustomStitchingRequestPayload {
  garmentType: string;
  fabricDetails?: string;
  designDetails?: string;
  color?: string;
  specialRequirements?: string;
  notes?: string;
  fitProfileId?: string;
  referenceImages?: ReferenceImagePayload[];
}

export const customStitchingApi = {
  create: (payload: CreateCustomStitchingRequestPayload) =>
    apiClient.post<CustomStitchingRequestDto>('/custom-stitching/requests', payload),
};
