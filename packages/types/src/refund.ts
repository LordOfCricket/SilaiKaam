// Refund domain types (Batch 10). No real payment provider exists yet —
// `status` is customer-facing and must never claim money has moved.

export const REFUND_STATUSES = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export interface RefundDto {
  id: string;
  orderId: string;
  orderItemId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}
