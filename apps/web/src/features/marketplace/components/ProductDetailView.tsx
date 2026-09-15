'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductDetailDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { wishlistApi } from '@/features/wishlist/api';
import { SaveButton } from '@/features/wishlist/components/SaveButton';
import { marketplaceApi } from '../api';
import styles from './ProductDetailView.module.css';

type LoadState =
  { kind: 'loading' } | { kind: 'error'; message: string; notFound?: boolean } | { kind: 'ready' };

export interface InitialSelection {
  size?: string;
  color?: string;
  qty?: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductDetailView({ slug, initial }: { slug: string; initial?: InitialSelection }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(initial?.size);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(initial?.color);
  const [quantity, setQuantity] = useState<number>(
    Number(initial?.qty) > 0 ? Number(initial?.qty) : 1,
  );

  const [isSaved, setIsSaved] = useState(false);
  const { status: authStatus } = useAuth();

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await marketplaceApi.findBySlug(slug);
      setProduct(data);
      setLoadState({ kind: 'ready' });
      if (authStatus === 'authenticated') {
        wishlistApi
          .list()
          .then((items) => setIsSaved(items.some((i) => i.productId === data.id)))
          .catch(() => {});
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoadState({
          kind: 'error',
          message: 'This product could not be found.',
          notFound: true,
        });
        return;
      }
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load this product. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [slug, authStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasVariants = (product?.variants.length ?? 0) > 0;

  const availableSizes = useMemo(() => {
    if (!product) return [];
    return Array.from(
      new Set(product.variants.map((v) => v.size).filter((s): s is string => Boolean(s))),
    );
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    return Array.from(
      new Set(
        product.variants
          .filter((v) => !selectedSize || v.size === selectedSize)
          .map((v) => v.color)
          .filter((c): c is string => Boolean(c)),
      ),
    );
  }, [product, selectedSize]);

  const selectedVariant = useMemo(() => {
    if (!product || !hasVariants) return null;
    return (
      product.variants.find(
        (v) =>
          (availableSizes.length === 0 || v.size === selectedSize) &&
          (availableColors.length === 0 || v.color === selectedColor),
      ) ?? null
    );
  }, [product, hasVariants, availableSizes, availableColors, selectedSize, selectedColor]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading product…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href="/marketplace" className={styles.backLink}>
            ← Back to Marketplace
          </Link>
          <FormBanner
            variant="error"
            message={loadState.message}
            onRetry={loadState.notFound ? undefined : () => void load()}
          />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const hasDiscount = product.discountPrice !== null && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  const needsSize = availableSizes.length > 0 && !selectedSize;
  const needsColor = availableColors.length > 0 && !selectedColor;
  const variantResolved = !hasVariants || Boolean(selectedVariant);
  const inStock = hasVariants
    ? Boolean(selectedVariant?.inStock)
    : product.availability === 'IN_STOCK';
  const maxQuantity = hasVariants ? (selectedVariant?.stock ?? 0) : 10;

  let selectionMessage: string | null = null;
  if (needsSize) selectionMessage = 'Select a size to continue.';
  else if (needsColor) selectionMessage = 'Select a color to continue.';
  else if (hasVariants && !selectedVariant) selectionMessage = 'This combination is not available.';
  else if (variantResolved && !inStock) selectionMessage = 'This selection is out of stock.';
  else if (quantity < 1 || quantity > maxQuantity)
    selectionMessage =
      maxQuantity > 0
        ? `Choose a quantity up to ${maxQuantity}.`
        : 'This selection is out of stock.';

  const canContinue = variantResolved && inStock && quantity >= 1 && quantity <= maxQuantity;

  const journeyParams = new URLSearchParams();
  if (selectedSize) journeyParams.set('size', selectedSize);
  if (selectedColor) journeyParams.set('color', selectedColor);
  journeyParams.set('qty', String(quantity));
  const journeyQuery = journeyParams.toString();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/marketplace" className={styles.backLink}>
          ← Back to Marketplace
        </Link>

        <div className={styles.layout}>
          <div className={styles.visual}>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension catalog images
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <span aria-hidden="true">No image yet</span>
            )}
          </div>

          <div>
            <p className={styles.category}>{product.category.name}</p>
            <div className={styles.titleRow}>
              <h1 className={styles.name}>{product.name}</h1>
              <SaveButton productId={product.id} initialSaved={isSaved} />
            </div>

            <div className={styles.priceRow}>
              {hasDiscount ? (
                <>
                  <span className={styles.price}>
                    {formatPrice(
                      selectedVariant?.price ?? product.discountPrice!,
                      product.currency,
                    )}
                  </span>
                  <span className={styles.originalPrice}>
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <span className={styles.discountPercent}>{discountPercent}% off</span>
                </>
              ) : (
                <span className={styles.price}>
                  {formatPrice(selectedVariant?.price ?? product.price, product.currency)}
                </span>
              )}
            </div>

            <p
              className={`${styles.availability} ${
                (hasVariants ? inStock : product.availability === 'IN_STOCK')
                  ? styles.availabilityIn
                  : styles.availabilityOut
              }`}
            >
              {hasVariants
                ? inStock
                  ? 'In stock'
                  : 'Out of stock'
                : product.availability === 'IN_STOCK'
                  ? 'In stock'
                  : product.availability === 'PREORDER'
                    ? 'Available for preorder'
                    : 'Out of stock'}
            </p>

            {product.description ? (
              <p className={styles.description}>{product.description}</p>
            ) : null}

            {availableSizes.length > 0 ? (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>Size</p>
                <div className={styles.optionChips} role="group" aria-label="Select size">
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.optionButton} ${selectedSize === s ? styles.optionButtonSelected : ''}`}
                      aria-pressed={selectedSize === s}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : product.sizes.length > 0 ? (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>Sizes</p>
                <div className={styles.optionChips}>
                  {product.sizes.map((s) => (
                    <span key={s} className={styles.chip}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {availableColors.length > 0 ? (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>Color</p>
                <div className={styles.optionChips} role="group" aria-label="Select color">
                  {availableColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.optionButton} ${selectedColor === c ? styles.optionButtonSelected : ''}`}
                      aria-pressed={selectedColor === c}
                      onClick={() => setSelectedColor(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : product.colors.length > 0 ? (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>Colors</p>
                <div className={styles.optionChips}>
                  {product.colors.map((c) => (
                    <span key={c} className={styles.chip}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={styles.optionGroup}>
              <label className={styles.optionLabel} htmlFor="pd-quantity">
                Quantity
              </label>
              <div className={styles.quantityRow}>
                <input
                  id="pd-quantity"
                  type="number"
                  min={1}
                  max={maxQuantity > 0 ? maxQuantity : undefined}
                  className={styles.quantityInput}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.currentTarget.value) || 1)}
                />
              </div>
            </div>

            <div className={styles.journeySection}>
              {selectionMessage ? (
                <p className={styles.selectionHint} role="status">
                  {selectionMessage}
                </p>
              ) : null}

              <div className={styles.journeyCard}>
                <div className={styles.journeyInfo}>
                  <strong>Buy Product Only</strong>
                  <span>Get the garment as selected.</span>
                </div>
                {canContinue ? (
                  <Button
                    href={`/marketplace/${product.slug}/buy?${journeyQuery}`}
                    variant="secondary"
                  >
                    Buy Product
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    Buy Product
                  </Button>
                )}
              </div>

              <div className={styles.journeyCard}>
                <div className={styles.journeyInfo}>
                  <strong>Buy + Fit</strong>
                  <span>Get the garment + SilaiKaam fitting service.</span>
                </div>
                {!product.isFittingEligible ? (
                  <Button disabled>Not available for this product</Button>
                ) : canContinue ? (
                  <Button href={`/marketplace/${product.slug}/buy-fit?${journeyQuery}`}>
                    Buy + Fit
                  </Button>
                ) : (
                  <Button disabled>Buy + Fit</Button>
                )}
              </div>
              {!product.isFittingEligible ? (
                <p className={styles.notice}>
                  This product isn&apos;t configured for SilaiKaam fitting yet, so only Buy Product
                  Only is available.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
