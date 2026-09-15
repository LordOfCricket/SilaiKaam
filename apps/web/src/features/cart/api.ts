import { apiClient } from '@/lib/api-client';
import type { CartDto, CartItemDto, CartItemType } from '@silaikaam/types';

export interface AddCartItemPayload {
  type: CartItemType;
  productId?: string;
  variantId?: string;
  quantity?: number;
  fitProfileId?: string;
  selectedFittingServiceIds?: string[];
  notes?: string;
  existingGarmentRequestId?: string;
  customStitchingRequestId?: string;
}

export const cartApi = {
  get: () => apiClient.get<CartDto>('/cart'),
  addItem: (payload: AddCartItemPayload) => apiClient.post<CartItemDto>('/cart/items', payload),
  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch<CartItemDto>(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => apiClient.delete<void>(`/cart/items/${itemId}`),
  clear: () => apiClient.delete<void>('/cart'),
};
