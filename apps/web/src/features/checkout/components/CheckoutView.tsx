'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AddressDto, CartDto, CartItemDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { accountApi } from '@/features/account/api';
import { cartApi } from '@/features/cart/api';
import { ordersApi } from '../../orders/api';
import styles from './CheckoutView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

// PRICING_UNAVAILABLE (Existing Garment) and QUOTE_REQUIRED (Custom
// Stitching) are the honest, expected state for those journeys — they must
// never block checkout. Every other cart-item issue does.
const NON_BLOCKING_ISSUE_CODES = new Set(['PRICING_UNAVAILABLE', 'QUOTE_REQUIRED']);

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

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CheckoutView() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [cart, setCart] = useState<CartDto | null>(null);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Generated once per checkout attempt — reused across retries (including
  // a double-click on "Place Order") so the server can recognize a resend.
  const idempotencyKeyRef = useRef<string>(randomId());

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const [cartData, profile] = await Promise.all([cartApi.get(), accountApi.getProfile()]);
      setCart(cartData);
      setAddresses(profile.addresses);
      setSelectedAddressId((current) => {
        if (current && profile.addresses.some((a) => a.id === current)) return current;
        const defaultAddress = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0];
        return defaultAddress?.id ?? null;
      });
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load checkout. Please try again.';
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
          Loading checkout…
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
          <h1 className={styles.title}>Checkout</h1>
          <div className={styles.emptyState}>
            <p>Your cart is empty — add something before checking out.</p>
            <Button href="/marketplace">Browse the marketplace</Button>
          </div>
        </div>
      </div>
    );
  }

  const blockingIssues = cart.items.flatMap((item) =>
    item.issues
      .filter((issue) => !NON_BLOCKING_ISSUE_CODES.has(issue.code))
      .map((issue) => ({ item, issue })),
  );

  const placeOrder = async () => {
    if (!selectedAddressId || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await ordersApi.placeOrder({
        addressId: selectedAddressId,
        idempotencyKey: idempotencyKeyRef.current,
      });
      router.push(`/orders/${result.order.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not place your order. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Checkout</h1>

        {blockingIssues.length > 0 ? (
          <FormBanner
            variant="error"
            message="Your cart needs attention before you can check out. Review it and try again."
          />
        ) : null}
        {blockingIssues.length > 0 ? (
          <Button href="/cart">Review cart</Button>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Delivery address</h2>
              {addresses.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Add a delivery address to continue.</p>
                  <Button href="/account">Add address</Button>
                </div>
              ) : (
                <div className={styles.addressList}>
                  {addresses.map((address) => (
                    <label key={address.id} className={styles.addressOption}>
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                      />
                      <span>
                        <strong>{address.label || 'Address'}</strong>
                        <br />
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''}, {address.city},{' '}
                        {address.state} {address.postalCode}, {address.country}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Order review</h2>
              <div className={styles.list}>
                {cart.items.map((item) => (
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
                      {item.selectedFittingServices.length > 0 ? (
                        <p className={styles.itemMeta}>
                          Services: {item.selectedFittingServices.map((s) => s.name).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <span className={styles.itemPrice}>
                      {item.lineTotal !== null ? formatPrice(item.lineTotal) : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.summary}>
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
                  Some items need pricing to be confirmed after checkout. The total above reflects
                  only what&apos;s priced so far.
                </p>
              ) : null}
              <p className={styles.pendingNote}>
                Payment: pending — we will confirm payment separately before your order is
                prepared.
              </p>
            </section>

            {submitError ? <FormBanner variant="error" message={submitError} /> : null}

            <Button
              onClick={() => void placeOrder()}
              disabled={submitting || !selectedAddressId || addresses.length === 0}
            >
              {submitting ? 'Placing order…' : 'Place order'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
