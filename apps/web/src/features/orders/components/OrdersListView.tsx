'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ORDER_STATUS_LABEL, type OrderSummaryDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { ordersApi } from '../api';
import styles from './OrdersListView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OrdersListView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [orders, setOrders] = useState<OrderSummaryDto[]>([]);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await ordersApi.list();
      setOrders(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your orders. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading your orders…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <FormBanner variant="error" message={loadState.message} onRetry={() => void load()} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>My Orders</h1>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Your orders will appear here.</p>
            <Button href="/marketplace">Browse the marketplace</Button>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className={styles.item}>
                <div>
                  <p className={styles.orderId}>Order #{order.id.slice(0, 8)}</p>
                  <p className={styles.orderMeta}>
                    {order.itemCount} item{order.itemCount === 1 ? '' : 's'} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className={styles.orderRight}>
                  <span className={styles.status}>{ORDER_STATUS_LABEL[order.status]}</span>
                  <span className={styles.total}>
                    {order.hasUnpricedItems ? `${formatPrice(order.total)}+` : formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
