// Order/checkout domain types shared across order-service, the gateway,
// and the web app.

import type { FitPreference, MeasurementKey } from './fit-profile';
import type { GarmentCondition } from './fitting-request';
import type { FittingProgressDto } from './fitting-workflow';
import type { ReorderInfoDto, ReviewableTargetDto } from './review';
import type { CancellationEligibilityDto, OrderCancellationDto } from './cancellation';
import type { RefundDto } from './refund';
import type { DisputeDto } from './dispute';

export const ORDER_ITEM_TYPES = [
  'PRODUCT_ONLY',
  'PRODUCT_WITH_FITTING',
  'EXISTING_GARMENT_FITTING',
  'CUSTOM_STITCHING',
] as const;
export type OrderItemType = (typeof ORDER_ITEM_TYPES)[number];

export const PAYMENT_STATES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'FITTING',
  'QUALITY_CHECK',
  'READY',
  'PREPARING_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'DELIVERY_FAILED',
  'DELIVERY_RESCHEDULED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Single source of truth for the customer-facing order status label — used
 * by Dashboard, Orders List, Order Detail, and Notifications so the same
 * status never reads differently in two places. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  FITTING: 'With our fitting team',
  QUALITY_CHECK: 'Quality check',
  READY: 'Ready',
  PREPARING_FOR_DELIVERY: 'Preparing for delivery',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DELIVERY_FAILED: 'Delivery unsuccessful',
  DELIVERY_RESCHEDULED: 'Delivery rescheduled',
};

export interface OrderAddressSnapshotDto {
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderMeasurementSnapshot {
  key: MeasurementKey;
  value: number;
  unit: string;
}

export interface OrderFittingServiceSnapshot {
  id: string;
  name: string;
  basePrice: number | null;
}

export interface OrderItemDto {
  id: string;
  type: OrderItemType;

  product: { id: string | null; name: string | null } | null;
  variant: { size: string | null; color: string | null } | null;
  quantity: number | null;
  unitPrice: number | null;
  discountAmount: number | null;

  fitProfile: { label: string; fitPreference: FitPreference } | null;
  measurements: OrderMeasurementSnapshot[];
  fittingServices: OrderFittingServiceSnapshot[];
  notes: string | null;

  existingGarment: {
    garmentType: string;
    condition: GarmentCondition;
    brand: string | null;
    photoCount: number;
  } | null;

  customStitching: {
    garmentType: string;
    fabricDetails: string | null;
    designDetails: string | null;
  } | null;

  lineTotal: number | null;

  /** Present only for PRODUCT_WITH_FITTING / EXISTING_GARMENT_FITTING items
   * that have an active fitting workflow — null otherwise (e.g. PRODUCT_ONLY,
   * CUSTOM_STITCHING, or before the workflow is created). */
  fitting: FittingProgressDto | null;

  /** Only populated once the order is COMPLETED. */
  reviewableTargets: ReviewableTargetDto[];
  /** Live-checked "Buy Again" info — only for PRODUCT_ONLY/PRODUCT_WITH_FITTING
   * items on a COMPLETED order; null otherwise (Existing Garment/Custom
   * Stitching repeat via the prefill endpoint instead, no live price to show). */
  reorder: ReorderInfoDto | null;
}

export interface OrderStatusHistoryEntryDto {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface OrderSummaryDto {
  id: string;
  status: OrderStatus;
  paymentState: PaymentState;
  total: number;
  hasUnpricedItems: boolean;
  itemCount: number;
  createdAt: string;
}

export interface OrderDetailDto {
  id: string;
  status: OrderStatus;
  paymentState: PaymentState;
  productSubtotal: number;
  fittingSubtotal: number;
  discountTotal: number;
  total: number;
  hasUnpricedItems: boolean;
  items: OrderItemDto[];
  address: OrderAddressSnapshotDto;
  statusHistory: OrderStatusHistoryEntryDto[];
  /** The full customer-facing status sequence relevant to this order's item
   * types, in display order — used to render the timeline (including
   * upcoming steps the order hasn't reached yet). */
  timelineSteps: OrderStatus[];
  /** Index into `timelineSteps` of the most recent forward progress —
   * computed server-side so a side-state like DELIVERY_FAILED (not itself
   * part of the linear timeline) still highlights the right prior step. */
  currentStepIndex: number;
  /** Customer-safe "what's happening now" text for the current status. */
  statusMessage: string;
  createdAt: string;
  /** Always present — the frontend shows either the "Cancel Order" action
   * or the reason it's unavailable, never both/neither. */
  cancellationEligibility: CancellationEligibilityDto;
  cancellation: OrderCancellationDto | null;
  refunds: RefundDto[];
  disputes: DisputeDto[];
}

export interface PlaceOrderResultDto {
  order: OrderDetailDto;
  /** True only when this call created a brand-new order — false when an
   * identical retry (same idempotency key) returned the original order. */
  created: boolean;
}
