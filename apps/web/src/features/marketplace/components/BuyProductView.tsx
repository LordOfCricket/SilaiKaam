'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProductDetailDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { cartApi } from '@/features/cart/api';
import { ApiError, NetworkError } from '@/lib/api-client';
import { marketplaceApi } from '../api';
import styles from './ProductDetailView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };
type AddState =
  { kind: 'idle' } | { kind: 'adding' } | { kind: 'added' } | { kind: 'error'; message: string };

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BuyProductView({
  slug,
  size,
  color,
  qty,
}: {
  slug: string;
  size?: string;
  color?: string;
  qty?: string;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [addState, setAddState] = useState<AddState>({ kind: 'idle' });
  const hasAttemptedAdd = useRef(false);
  const quantity = Number(qty) > 0 ? Number(qty) : 1;

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await marketplaceApi.findBySlug(slug);
      setProduct(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load this product. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const variant = useMemo(() => {
    if (!product || product.variants.length === 0) return null;
    return (
      product.variants.find((v) => (!size || v.size === size) && (!color || v.color === color)) ??
      null
    );
  }, [product, size, color]);

  const addToCart = useCallback(async () => {
    if (!product) return;
    setAddState({ kind: 'adding' });
    try {
      await cartApi.addItem({
        type: 'PRODUCT_ONLY',
        productId: product.id,
        variantId: variant?.id,
        quantity,
      });
      setAddState({ kind: 'added' });
    } catch (error) {
      setAddState({
        kind: 'error',
        message:
          error instanceof ApiError || error instanceof NetworkError
            ? error.message
            : 'Could not add this to your cart.',
      });
    }
  }, [product, variant, quantity]);

  useEffect(() => {
    if (loadState.kind === 'ready' && !hasAttemptedAdd.current) {
      hasAttemptedAdd.current = true;
      void addToCart();
    }
  }, [loadState.kind, addToCart]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error' || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href="/marketplace" className={styles.backLink}>
            ← Back to Marketplace
          </Link>
          <FormBanner
            variant="error"
            message={
              loadState.kind === 'error' ? loadState.message : 'Could not load this product.'
            }
            onRetry={() => void load()}
          />
        </div>
      </div>
    );
  }

  const price = variant?.price ?? product.discountPrice ?? product.price;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href={`/marketplace/${slug}`} className={styles.backLink}>
          ← Back to product
        </Link>
        <h1 className={styles.name}>Buy Product</h1>

        {addState.kind === 'adding' ? (
          <FormBanner variant="success" message="Adding to your cart…" />
        ) : addState.kind === 'error' ? (
          <FormBanner variant="error" message={addState.message} onRetry={() => void addToCart()} />
        ) : addState.kind === 'added' ? (
          <FormBanner variant="success" message="Added to your cart." />
        ) : null}

        <div className={styles.journeyCard}>
          <div className={styles.journeyInfo}>
            <strong>{product.name}</strong>
            <span>
              {[size, color].filter(Boolean).join(' · ') || 'Standard'} · Qty {quantity}
            </span>
          </div>
          <span className={styles.price}>{formatPrice(price, product.currency)}</span>
        </div>

        {addState.kind === 'added' ? (
          <div className={styles.journeyCard}>
            <Button href="/cart">View cart</Button>
            <Button href="/marketplace" variant="secondary">
              Continue shopping
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
