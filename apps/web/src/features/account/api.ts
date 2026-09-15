import { apiClient } from '@/lib/api-client';
import type { AddressDto, CustomerProfileDto } from '@silaikaam/types';

export interface UpdateProfilePayload {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
}

export interface AddressPayload {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export const accountApi = {
  getProfile: () => apiClient.get<CustomerProfileDto>('/customers/me'),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<CustomerProfileDto>('/customers/me', payload),
  createAddress: (payload: AddressPayload) =>
    apiClient.post<AddressDto>('/customers/me/addresses', payload),
  updateAddress: (id: string, payload: Partial<AddressPayload>) =>
    apiClient.patch<AddressDto>(`/customers/me/addresses/${id}`, payload),
  deleteAddress: (id: string) => apiClient.delete<void>(`/customers/me/addresses/${id}`),
};
