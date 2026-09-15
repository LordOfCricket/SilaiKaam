'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CartDto, CartItemDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { cartApi } from '../api';
import styles from './CartView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const ITEM_TYPE_LABELS: Record<CartItemDto['type'], string> = {
  PRODUCT_ONLY: 'Product',
  BUY_FIT: 'Buy + Fit',
  EXISTING_GARMENT: 'Existing Garment Fitting',
  CUSTOM_STITCHING: 'Custom Stitching',
};

function itemName(item: CartItemDto): string {
  if (item.product) return item.product.name;
  if (item.existingGarment) return item.existingGarment.garmentType;
  if (item.customStitching) return item.customStitching.garmentType;
  return 'Item';
}

export function CartView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [cart, setCart] = useState<CartDto | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await cartApi.get();
      setCart(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your cart. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setActionError(null);
    setBusyItemId(itemId);
    try {
      await cartApi.updateItem(itemId, quantity);
      await load();
    } catch (error) {
      setActionError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not update this item.',
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setActionError(null);
    setBusyItemId(itemId);
    try {
      await cartApi.removeItem(itemId);
      await load();
    } catch (error) {
      setActionError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not remove this item.',
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const clearCart = async () => {
    setActionError(null);
    try {
      await cartApi.clear();
      await load();
    } catch (error) {
      setActionError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not clear your cart.',
      );
    }
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading your cart…
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

  if (!cart) return null;

  if (cart.items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Your Cart</h1>
          <div className={styles.emptyState}>
            <p>Your cart is empty.</p>
            <Button href="/marketplace">Browse the marketplace</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Cart</h1>
          <button type="button" className={styles.clearButton} onClick={() => void clearCart()}>
            Clear cart
          </button>
        </div>

        {actionError ? <FormBanner variant="error" message={actionError} /> : null}

        <div className={styles.list}>
          {cart.items.map((item) => (
            <div className={styles.item} key={item.id}>
              <div className={styles.itemInfo}>
                <p className={styles.itemType}>{ITEM_TYPE_LABELS[item.type]}</p>
                <p className={styles.itemName}>{itemName(item)}</p>
                {item.variant ? (
                  <p className={styles.itemMeta}>
                    {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {item.fitProfile ? (
                  <p className={styles.itemMeta}>Fit Profile: {item.fitProfile.label}</p>
                ) : null}
                {item.selectedFittingServices.length > 0 ? (
                  <p className={styles.itemMeta}>
                    Services: {item.selectedFittingServices.map((s) => s.name).join(', ')}
                  </p>
                ) : null}
                {item.existingGarment ? (
                  <p className={styles.itemMeta}>
                    Condition: {item.existingGarment.condition} · {item.existingGarment.photoCount}{' '}
                    photo
                    {item.existingGarment.photoCount === 1 ? '' : 's'}
                  </p>
                ) : null}

                {(item.type === 'PRODUCT_ONLY' || item.type === 'BUY_FIT') &&
                item.quantity !== null ? (
                  <div className={styles.quantityRow}>
                    <label htmlFor={`qty-${item.id}`} className={styles.itemMeta}>
                      Qty
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={1}
                      max={10}
                      className={styles.quantityInput}
                      value={item.quantity}
                      disabled={busyItemId === item.id}
                      onChange={(e) =>
                        void updateQuantity(item.id, Number(e.currentTarget.value) || 1)
                      }
                    />
                  </div>
                ) : null}

                {item.issues.map((issue) => (
                  <p key={issue.code} className={styles.issue} role="alert">
                    {issue.message}
                  </p>
                ))}
              </div>

              <div className={styles.itemActions}>
                {item.lineTotal !== null ? (
                  <span className={styles.itemPrice}>{formatPrice(item.lineTotal)}</span>
                ) : (
                  <span className={styles.itemMeta}>Pricing to be confirmed</span>
                )}
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => void removeItem(item.id)}
                  disabled={busyItemId === item.id}
                >
                  {busyItemId === item.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Product subtotal</span>
            <span>{formatPrice(cart.productSubtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Fitting subtotal</span>
            <span>{cart.fittingSubtotal > 0 ? formatPrice(cart.fittingSubtotal) : '—'}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Estimated total</span>
            <span>{formatPrice(cart.estimatedTotal)}</span>
          </div>
          {cart.hasUnpricedItems ? (
            <p className={styles.pendingNote}>
              Some items need pricing to be confirmed (fitting fees, custom stitching quotes, or
              garment inspection). The total above reflects only what&apos;s priced so far.
            </p>
          ) : null}
        </div>

        <div className={styles.header}>
          <Link href="/marketplace" className={styles.clearButton}>
            ← Continue shopping
          </Link>
          <Button href="/checkout">Proceed to checkout</Button>
        </div>
      </div>
    </div>
  );
}
