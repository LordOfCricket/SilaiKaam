// Cart domain types shared across order-service, the gateway, and the web app.

import type { FitPreference } from './fit-profile';
import type { GarmentCondition } from './fitting-request';

export const CART_ITEM_TYPES = [
  'PRODUCT_ONLY',
  'BUY_FIT',
  'EXISTING_GARMENT',
  'CUSTOM_STITCHING',
] as const;
export type CartItemType = (typeof CART_ITEM_TYPES)[number];

export interface CartItemIssue {
  code: string;
  /** Customer-facing, e.g. "Size M is no longer available." */
  message: string;
}

export interface CartFittingServiceSummary {
  id: string;
  name: string;
  basePrice: number | null;
}

export interface CartItemDto {
  id: string;
  type: CartItemType;
  createdAt: string;

  // PRODUCT_ONLY / BUY_FIT
  product: { id: string; name: string; slug: string; imageUrl: string | null } | null;
  variant: { id: string; size: string | null; color: string | null } | null;
  quantity: number | null;
  unitPrice: number | null;

  // BUY_FIT only
  fitProfile: { id: string; label: string; fitPreference: FitPreference } | null;
  selectedFittingServices: CartFittingServiceSummary[];
  notes: string | null;

  // EXISTING_GARMENT
  existingGarment: {
    requestId: string;
    garmentType: string;
    condition: GarmentCondition;
    photoCount: number;
  } | null;

  // CUSTOM_STITCHING
  customStitching: { requestId: string; garmentType: string } | null;

  /** Null when pricing/quote isn't available yet for this item. */
  lineTotal: number | null;
  /** Live-validation problems found on this read (stock gone, price
   * changed, service no longer offered, measurement missing, ...). Never
   * silently corrected — surfaced for the customer to resolve. */
  issues: CartItemIssue[];
}

export interface CartDto {
  items: CartItemDto[];
  productSubtotal: number;
  fittingSubtotal: number;
  hasUnpricedItems: boolean;
  estimatedTotal: number;
}
