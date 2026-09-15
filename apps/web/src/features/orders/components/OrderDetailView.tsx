'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrderDetailDto, OrderItemDto, OrderStatus } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { ordersApi } from '../api';
import styles from './OrderDetailView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const ITEM_TYPE_LABELS: Record<OrderItemDto['type'], string> = {
  PRODUCT_ONLY: 'Product',
  PRODUCT_WITH_FITTING: 'Buy + Fit',
  EXISTING_GARMENT_FITTING: 'Existing Garment Fitting',
  CUSTOM_STITCHING: 'Custom Stitching',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  FITTING: 'With our fitting team',
  QUALITY_CHECK: 'Quality check',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function itemName(item: OrderItemDto): string {
  if (item.product?.name) return item.product.name;
  if (item.existingGarment) return item.existingGarment.garmentType;
  if (item.customStitching) return item.customStitching.garmentType;
  return 'Item';
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [order, setOrder] = useState<OrderDetailDto | null>(null);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await ordersApi.get(orderId);
      setOrder(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load this order. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading order…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error' || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <FormBanner
            variant="error"
            message={loadState.kind === 'error' ? loadState.message : 'Order not found.'}
            onRetry={() => void load()}
          />
        </div>
      </div>
    );
  }

  const currentStepIndex = order.timelineSteps.indexOf(order.status);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Order #{order.id.slice(0, 8)}</h1>
          <span className={styles.placedOn}>
            Placed {new Date(order.createdAt).toLocaleDateString()}
          </span>
        </div>

        {order.status !== 'CANCELLED' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Status</h2>
            <ol className={styles.timeline}>
              {order.timelineSteps.map((step, index) => (
                <li
                  key={step}
                  className={`${styles.timelineStep} ${index <= currentStepIndex ? styles.timelineStepDone : ''}`}
                >
                  {STATUS_LABELS[step]}
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <FormBanner variant="error" message="This order was cancelled." />
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <div className={styles.list}>
            {order.items.map((item) => (
              <div className={styles.item} key={item.id}>
                <div>
                  <p className={styles.itemType}>{ITEM_TYPE_LABELS[item.type]}</p>
                  <p className={styles.itemName}>{itemName(item)}</p>
                  {item.variant ? (
                    <p className={styles.itemMeta}>
                      {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                      {item.quantity ? ` · Qty ${item.quantity}` : ''}
                    </p>
                  ) : null}
                  {item.fitProfile ? (
                    <p className={styles.itemMeta}>Fit Profile: {item.fitProfile.label}</p>
                  ) : null}
                  {item.fittingServices.length > 0 ? (
                    <p className={styles.itemMeta}>
                      Services: {item.fittingServices.map((s) => s.name).join(', ')}
                    </p>
                  ) : null}
                  {item.existingGarment ? (
                    <p className={styles.itemMeta}>
                      Condition: {item.existingGarment.condition} ·{' '}
                      {item.existingGarment.photoCount} photo
                      {item.existingGarment.photoCount === 1 ? '' : 's'}
                    </p>
                  ) : null}
                  {item.customStitching?.fabricDetails ? (
                    <p className={styles.itemMeta}>Fabric: {item.customStitching.fabricDetails}</p>
                  ) : null}
                </div>
                <span className={styles.itemPrice}>
                  {item.lineTotal !== null ? formatPrice(item.lineTotal) : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Delivery address</h2>
          <p className={styles.address}>
            {order.address.label ? <strong>{order.address.label}</strong> : null}
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city},{' '}
            {order.address.state} {order.address.postalCode}, {order.address.country}
          </p>
        </section>

        <section className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Product subtotal</span>
            <span>{formatPrice(order.productSubtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Fitting subtotal</span>
            <span>{order.fittingSubtotal > 0 ? formatPrice(order.fittingSubtotal) : '—'}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.hasUnpricedItems ? (
            <p className={styles.pendingNote}>
              Some items are still pending pricing confirmation (fitting fees, custom stitching
              quotes, or garment inspection).
            </p>
          ) : null}
          <p className={styles.pendingNote}>
            Payment status: {order.paymentState === 'PENDING' ? 'Pending' : order.paymentState}
          </p>
        </section>
      </div>
    </div>
  );
}
