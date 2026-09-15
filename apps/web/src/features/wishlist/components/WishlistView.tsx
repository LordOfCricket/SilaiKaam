'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { WishlistItemDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { cartApi } from '@/features/cart/api';
import { wishlistApi } from '../api';
import styles from './WishlistView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function WishlistCard({ item, onRemoved }: { item: WishlistItemDto; onRemoved: () => void }) {
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { product } = item;
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;
  const canQuickAdd = product.variants.length === 0 || singleVariant !== null;

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      await wishlistApi.remove(item.productId);
      onRemoved();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not remove this item. Please try again.',
      );
    } finally {
      setRemoving(false);
    }
  };

  const quickAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      await cartApi.addItem({
        type: 'PRODUCT_ONLY',
        productId: product.id,
        variantId: singleVariant?.id,
        quantity: 1,
      });
      setAdded(true);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not add this to your cart. Please try again.',
      );
    } finally {
      setAdding(false);
    }
  };

  const unavailable = !item.available || product.availability === 'OUT_OF_STOCK';

  return (
    <div className={styles.card}>
      <Link href={`/marketplace/${product.slug}`} className={styles.visual}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension catalog images
          <img src={product.imageUrl} alt="" />
        ) : (
          <span aria-hidden="true">No image yet</span>
        )}
      </Link>
      <div className={styles.info}>
        <p className={styles.category}>{product.category.name}</p>
        <Link href={`/marketplace/${product.slug}`} className={styles.name}>
          {product.name}
        </Link>
        <p className={styles.price}>{formatPrice(product.discountPrice ?? product.price, product.currency)}</p>
        {unavailable ? (
          <p className={styles.unavailable} role="status">
            {!item.available ? 'This item is no longer available.' : 'Out of stock.'}
          </p>
        ) : null}
        {error ? <FormBanner variant="error" message={error} onRetry={() => void quickAdd()} /> : null}
        <div className={styles.actions}>
          {!unavailable && canQuickAdd ? (
            added ? (
              <span className={styles.addedNote} role="status">
                Added to your cart. <Link href="/cart">View cart</Link>
              </span>
            ) : (
              <Button onClick={() => void quickAdd()} disabled={adding}>
                {adding ? 'Adding…' : 'Add to Cart'}
              </Button>
            )
          ) : !unavailable ? (
            <Button href={`/marketplace/${product.slug}`}>Select options</Button>
          ) : null}
          <button type="button" className={styles.removeButton} onClick={() => void remove()} disabled={removing}>
            {removing ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WishlistView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [items, setItems] = useState<WishlistItemDto[]>([]);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await wishlistApi.list();
      setItems(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your wishlist. Please try again.';
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
          Loading your wishlist…
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
        <h1 className={styles.title}>My Wishlist</h1>

        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Save products here to find them later.</p>
            <Button href="/marketplace">Browse the marketplace</Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                onRemoved={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
