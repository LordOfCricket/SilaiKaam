// Notification domain types (Batch 9). Only ever created for events that
// actually happened — no fabricated progress.

export const NOTIFICATION_TYPES = [
  'ORDER_PLACED',
  'ORDER_STATUS_CHANGED',
  'FITTING_ACTION_REQUIRED',
  'FITTING_PROGRESS',
  'QC_PASSED',
  'REWORK_REQUIRED',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERY_FAILED',
  'DELIVERY_RESCHEDULED',
  'ORDER_DELIVERED',
  'ORDER_COMPLETED',
  'REVIEW_AVAILABLE',
  'CANCELLATION_CONFIRMED',
  'REFUND_REQUESTED',
  'REFUND_PROCESSING',
  'REFUND_COMPLETED',
  'REFUND_FAILED',
  'DISPUTE_OPENED',
  'DISPUTE_UPDATED',
  'DISPUTE_RESOLVED',
  'REWORK_REQUESTED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Single source of truth for notification titles, shared by every service
 * that creates notifications (order-service, fitting-service) so the same
 * event type always reads the same way. */
export const NOTIFICATION_TITLE: Record<NotificationType, string> = {
  ORDER_PLACED: 'Order placed',
  ORDER_STATUS_CHANGED: 'Order update',
  FITTING_ACTION_REQUIRED: 'Action needed',
  FITTING_PROGRESS: 'Fitting update',
  QC_PASSED: 'Quality check passed',
  REWORK_REQUIRED: 'Fitting update',
  READY_FOR_DELIVERY: 'Ready for delivery',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERY_FAILED: 'Delivery unsuccessful',
  DELIVERY_RESCHEDULED: 'Delivery rescheduled',
  ORDER_DELIVERED: 'Order delivered',
  ORDER_COMPLETED: 'Order completed',
  REVIEW_AVAILABLE: 'Share your feedback',
  CANCELLATION_CONFIRMED: 'Order cancelled',
  REFUND_REQUESTED: 'Refund requested',
  REFUND_PROCESSING: 'Refund processing',
  REFUND_COMPLETED: 'Refund completed',
  REFUND_FAILED: 'Refund unsuccessful',
  DISPUTE_OPENED: 'Issue reported',
  DISPUTE_UPDATED: 'Issue update',
  DISPUTE_RESOLVED: 'Issue resolved',
  REWORK_REQUESTED: 'Adjustment requested',
};

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedOrderId: string | null;
  relatedOrderItemId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResultDto {
  items: NotificationDto[];
  unreadCount: number;
  total: number;
}
