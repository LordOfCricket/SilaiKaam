import { apiClient } from '@/lib/api-client';
import type { WishlistItemDto } from '@silaikaam/types';

export const wishlistApi = {
  list: () => apiClient.get<WishlistItemDto[]>('/wishlist'),
  add: (productId: string) => apiClient.post<WishlistItemDto>('/wishlist/items', { productId }),
  remove: (productId: string) => apiClient.delete<void>(`/wishlist/items/${productId}`),
};
