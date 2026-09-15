// Catalog/marketplace domain types shared across services and the web app.

import type { MeasurementKey } from './fit-profile';

export const PRODUCT_AVAILABILITY = ['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'] as const;
export type ProductAvailability = (typeof PRODUCT_AVAILABILITY)[number];

export const FITTING_SERVICE_TYPES = [
  'SLEEVE_ALTERATION',
  'LENGTH_ALTERATION',
  'WAIST_ALTERATION',
  'CHEST_ALTERATION',
  'SHOULDER_ALTERATION',
  'TAPERING',
] as const;
export type FittingServiceType = (typeof FITTING_SERVICE_TYPES)[number];

export const PRODUCT_SORT_OPTIONS = ['relevance', 'price_asc', 'price_desc', 'newest'] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface ProductSummaryDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  currency: string;
  imageUrl: string | null;
  availability: ProductAvailability;
  category: CategoryDto;
}

export interface ProductVariantDto {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  inStock: boolean;
}

export interface ProductDetailDto extends ProductSummaryDto {
  description: string | null;
  sizes: string[];
  colors: string[];
  isFittingEligible: boolean;
  /** Real, purchasable size/color combinations with their own stock. Empty
   * when the product has no configured variants — the UI then falls back
   * to the product's own price/availability as a single implicit variant. */
  variants: ProductVariantDto[];
}

export interface ProductListResultDto {
  items: ProductSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export interface FittingServiceDto {
  id: string;
  type: FittingServiceType;
  name: string;
  description: string | null;
  requiredMeasurements: MeasurementKey[];
  /** Null means no pricing service has configured a fee yet — the UI must
   * show "pricing unavailable", never a fabricated amount. */
  basePrice: number | null;
}
