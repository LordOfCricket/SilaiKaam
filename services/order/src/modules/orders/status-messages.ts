import type { OrderStatus } from '@silaikaam/types';

/** Fallback customer-safe text when a status-history row has no `note`
 * (e.g. the initial PLACED row) — and the single source of truth for the
 * text new delivery-transition history rows record. */
export const ORDER_STATUS_MESSAGE: Record<OrderStatus, string> = {
  PLACED: 'Your order has been placed.',
  CONFIRMED: 'Your order has been confirmed.',
  PREPARING: 'Your order is being prepared.',
  FITTING: 'Fitting in Progress',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Your order is ready for delivery.',
  PREPARING_FOR_DELIVERY: 'Your order is being prepared for delivery.',
  OUT_FOR_DELIVERY: 'Your order is on its way.',
  DELIVERED: 'Your order was delivered.',
  COMPLETED: 'Completed.',
  CANCELLED: 'This order was cancelled.',
  DELIVERY_FAILED: "We couldn't complete the delivery. Please review the available next step.",
  DELIVERY_RESCHEDULED: 'Your delivery has been rescheduled.',
};
