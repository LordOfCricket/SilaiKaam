// Review/reorder domain types (Batch 8), shared across order-service, the
// gateway, and the web app.

export const REVIEW_TARGET_TYPES = ['PRODUCT', 'FITTING', 'CUSTOM_STITCHING'] as const;
export type ReviewTargetType = (typeof REVIEW_TARGET_TYPES)[number];

export interface ReviewDto {
  id: string;
  orderId: string;
  orderItemId: string;
  targetType: ReviewTargetType;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One reviewable target for an order item — "Rate your product"/"Rate
 * your fitting" — reflecting any review already submitted so the UI never
 * shows a fake/duplicate prompt. */
export interface ReviewableTargetDto {
  targetType: ReviewTargetType;
  existingReview: ReviewDto | null;
}

/** Live, server-checked reorder info for a PRODUCT_ONLY/PRODUCT_WITH_FITTING
 * item on a completed order — never a cached/historical price. */
export interface ReorderInfoDto {
  eligible: boolean;
  reason: string | null;
  currentPrice: number | null;
}

export interface ReorderPrefillDto {
  garmentType: string;
  condition: string | null;
  brand: string | null;
  currentSize: string | null;
  fabricDetails: string | null;
  designDetails: string | null;
  color: string | null;
  specialRequirements: string | null;
  fitProfileId: string | null;
  selectedFittingServiceIds: string[];
}

export type ReorderResultDto =
  | { kind: 'ADDED_TO_CART' }
  | { kind: 'PREFILL'; itemType: 'EXISTING_GARMENT_FITTING' | 'CUSTOM_STITCHING'; prefill: ReorderPrefillDto };
