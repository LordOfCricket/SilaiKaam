// Dispute domain types (Batch 10). Structured business data distinct from
// SupportTicket (communication) — see Dispute model comment.

export const DISPUTE_TYPES = [
  'FIT_ISSUE',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'MISSING_ITEM',
  'QUALITY_ISSUE',
  'DELIVERY_ISSUE',
  'OTHER',
] as const;
export type DisputeType = (typeof DISPUTE_TYPES)[number];

export const DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED', 'CLOSED'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export interface DisputeDto {
  id: string;
  orderId: string;
  orderItemId: string | null;
  type: DisputeType;
  description: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
