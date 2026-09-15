// Fitting workflow types (Batch 6). `FittingWorkflowStatus` mirrors the
// Prisma enum so both order-service and fitting-service can share one
// customer-safe mapping (single source of truth, no drift) — but the
// customer-facing API only ever returns the derived `FittingProgressDto`,
// never this internal status directly.

import type { OrderStatus } from './order';

export const FITTING_WORKFLOW_STATUSES = [
  'RECEIVED',
  'INSPECTION',
  'ACTION_REQUIRED',
  'ASSIGNED',
  'IN_PROGRESS',
  'QC',
  'REWORK_REQUIRED',
  'READY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const;
export type FittingWorkflowStatus = (typeof FITTING_WORKFLOW_STATUSES)[number];

export const FITTING_CUSTOMER_MESSAGE: Record<FittingWorkflowStatus, string> = {
  RECEIVED: 'Your garment has been received and will be reviewed shortly.',
  INSPECTION: 'Your garment is being inspected.',
  ACTION_REQUIRED: 'We need some additional information before we can continue.',
  ASSIGNED: 'Fitting in Progress',
  IN_PROGRESS: 'Fitting in Progress',
  QC: 'Quality Check',
  REWORK_REQUIRED: "We're making an additional adjustment to ensure the fit is right.",
  READY: 'Ready',
  COMPLETED: 'Completed',
  REJECTED: "We're unable to proceed with this garment. Our team will contact you about next steps.",
  CANCELLED: 'This fitting was cancelled.',
};

/** Customer-facing status, reusing OrderStatus's vocabulary so the web app
 * needs no new enum and the existing order timeline renders it directly. */
export const FITTING_CUSTOMER_STATUS: Record<FittingWorkflowStatus, OrderStatus> = {
  RECEIVED: 'PREPARING',
  INSPECTION: 'PREPARING',
  ACTION_REQUIRED: 'PREPARING',
  ASSIGNED: 'FITTING',
  IN_PROGRESS: 'FITTING',
  REWORK_REQUIRED: 'FITTING',
  QC: 'QUALITY_CHECK',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  REJECTED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
};

export interface FittingActionRequiredDto {
  id: string;
  requestedInfo: string;
}

export interface FittingProgressDto {
  /** Customer-safe status, reusing OrderStatus's vocabulary. */
  status: OrderStatus;
  message: string;
  actionRequired: FittingActionRequiredDto | null;
}

export interface RespondActionRequestResultDto {
  status: 'SUBMITTED';
  message: string;
}
