import { FITTING_CUSTOMER_MESSAGE, FITTING_CUSTOMER_STATUS, type OrderStatus } from '@silaikaam/types';
import type { FittingWorkflowStatus } from '@silaikaam/database';

export { FITTING_CUSTOMER_MESSAGE as CUSTOMER_MESSAGE, FITTING_CUSTOMER_STATUS as CUSTOMER_STATUS };

/** Every valid target the generic `advance()` op may move a workflow to,
 * keyed by its current status. RECEIVED/ACTION_REQUIRED -> INSPECTION/
 * ASSIGNED/REJECTED only happen via `recordInspection`; QC -> READY only via
 * `markReady` (proof-gated) — both are intentionally excluded here so there
 * is exactly one path into each of those statuses. */
export const ADVANCE_TRANSITIONS: Partial<Record<FittingWorkflowStatus, FittingWorkflowStatus[]>> = {
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['QC', 'CANCELLED'],
  QC: ['REWORK_REQUIRED', 'CANCELLED'],
  REWORK_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
  READY: ['COMPLETED'],
  RECEIVED: ['CANCELLED'],
  INSPECTION: ['CANCELLED'],
  ACTION_REQUIRED: ['CANCELLED'],
};

/** Statuses `recordInspection` may run from — before, or re-entering after
 * a customer response. */
export const INSPECTABLE_STATUSES: FittingWorkflowStatus[] = ['RECEIVED', 'ACTION_REQUIRED'];

export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  PLACED: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  FITTING: 3,
  QUALITY_CHECK: 4,
  READY: 5,
  PREPARING_FOR_DELIVERY: 6,
  OUT_FOR_DELIVERY: 7,
  DELIVERED: 8,
  COMPLETED: 9,
  CANCELLED: -1,
  DELIVERY_FAILED: -1,
  DELIVERY_RESCHEDULED: -1,
};

export const QC_PASS_MESSAGE = 'Your garment has passed our quality check.';
