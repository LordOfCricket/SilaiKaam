import { apiClient } from '@/lib/api-client';
import type {
  ExistingGarmentRequestDto,
  GarmentCondition,
  GarmentPhotoRole,
} from '@silaikaam/types';

export interface GarmentPhotoPayload {
  role: GarmentPhotoRole;
  mimeType: string;
  dataBase64: string;
}

export interface CreateExistingGarmentRequestPayload {
  garmentType: string;
  brand?: string;
  currentSize?: string;
  condition: GarmentCondition;
  notes?: string;
  fitProfileId?: string;
  selectedFittingServiceIds: string[];
  photos: GarmentPhotoPayload[];
}

export const existingGarmentApi = {
  create: (payload: CreateExistingGarmentRequestPayload) =>
    apiClient.post<ExistingGarmentRequestDto>('/existing-garment/requests', payload),
};
