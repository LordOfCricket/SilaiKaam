// Cancellation domain types (Batch 10).

export const CANCELLATION_REASONS = [
  'CUSTOMER_CHANGED_MIND',
  'ORDERED_BY_MISTAKE',
  'DELIVERY_TOO_LATE',
  'WRONG_ITEM',
  'OTHER',
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export interface CancellationEligibilityDto {
  eligible: boolean;
  /** Customer-safe explanation shown whether eligible or not. */
  reason: string;
}

export interface OrderCancellationDto {
  id: string;
  orderId: string;
  reason: CancellationReason;
  note: string | null;
  createdAt: string;
}

export interface CancelOrderResultDto {
  cancellation: OrderCancellationDto;
  refundCreated: boolean;
}
