// Wishlist domain types shared across user-service, the gateway, and the
// web app. Wishlist items are references only — the nested `product` is
// always resolved from CURRENT catalog data, never a saved snapshot.

import type { ProductDetailDto } from './catalog';

export interface WishlistItemDto {
  id: string;
  productId: string;
  createdAt: string;
  /** Live — false when the product has since been made inactive. */
  available: boolean;
  product: ProductDetailDto;
}
