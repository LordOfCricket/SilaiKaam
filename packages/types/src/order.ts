// Order/checkout domain types shared across order-service, the gateway,
// and the web app.

import type { FitPreference, MeasurementKey } from './fit-profile';
import type { GarmentCondition } from './fitting-request';

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
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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
  createdAt: string;
}

export interface PlaceOrderResultDto {
  order: OrderDetailDto;
  /** True only when this call created a brand-new order — false when an
   * identical retry (same idempotency key) returned the original order. */
  created: boolean;
}
