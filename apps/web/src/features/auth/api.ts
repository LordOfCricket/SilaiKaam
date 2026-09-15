import { apiClient } from '@/lib/api-client';
import type { AuthUser } from '@silaikaam/types';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) => apiClient.post<AuthUser>('/auth/register', payload),
  login: (payload: LoginPayload) => apiClient.post<AuthUser>('/auth/login', payload),
  logout: () => apiClient.post<{ success: true }>('/auth/logout'),
  me: () => apiClient.get<AuthUser>('/auth/me'),
};
