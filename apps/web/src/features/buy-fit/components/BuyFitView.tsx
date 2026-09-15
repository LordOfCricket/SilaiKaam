'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FitProfileDto,
  FittingServiceDto,
  MeasurementKey,
  ProductDetailDto,
} from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { cartApi } from '@/features/cart/api';
import { fitProfileApi } from '@/features/fit-profile/api';
import { LOWER_BODY_FIELDS, UPPER_BODY_FIELDS } from '@/features/fit-profile/measurementFields';
import { marketplaceApi } from '@/features/marketplace/api';
import { ApiError, NetworkError } from '@/lib/api-client';
import styles from './BuyFitView.module.css';

const MEASUREMENT_LABELS = new Map(
  [...UPPER_BODY_FIELDS, ...LOWER_BODY_FIELDS].map((f) => [f.key, f.label]),
);

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BuyFitView({
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
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [fittingServices, setFittingServices] = useState<FittingServiceDto[]>([]);
  const [fitProfile, setFitProfile] = useState<FitProfileDto | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const quantity = Number(qty) > 0 ? Number(qty) : 1;

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const [productData, servicesData] = await Promise.all([
        marketplaceApi.findBySlug(slug),
        marketplaceApi.listFittingServices(slug),
      ]);
      setProduct(productData);
      setFittingServices(servicesData);

      try {
        const profile = await fitProfileApi.get();
        setFitProfile(profile ?? null);
      } catch (profileError) {
        if (profileError instanceof ApiError && profileError.status === 401) {
          router.replace(`/login?redirect=/marketplace/${slug}/buy-fit&expired=1`);
          return;
        }
        setFitProfile(null);
      }

      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load Buy + Fit. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [slug, router]);

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

  const measurementKeys = useMemo(
    () => new Set((fitProfile?.measurements ?? []).map((m) => m.key)),
    [fitProfile],
  );

  const missingFor = useCallback(
    (service: FittingServiceDto): MeasurementKey[] =>
      service.requiredMeasurements.filter((k) => !measurementKeys.has(k)),
    [measurementKeys],
  );

  const toggleService = (service: FittingServiceDto) => {
    if (missingFor(service).length > 0) return;
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(service.id)) next.delete(service.id);
      else next.add(service.id);
      return next;
    });
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading Buy + Fit…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error' || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href={`/marketplace/${slug}`} className={styles.backLink}>
            ← Back to product
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

  if (!product.isFittingEligible) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href={`/marketplace/${slug}`} className={styles.backLink}>
            ← Back to product
          </Link>
          <FormBanner variant="error" message="This product isn't available for Buy + Fit." />
        </div>
      </div>
    );
  }

  const hasVariants = product.variants.length > 0;
  const outOfStock = hasVariants ? !variant?.inStock : product.availability !== 'IN_STOCK';
  const unitPrice = variant?.price ?? product.discountPrice ?? product.price;
  const productSubtotal = unitPrice * quantity;

  const selectedServices = fittingServices.filter((s) => selectedServiceIds.has(s.id));
  const knownFittingTotal = selectedServices.reduce((sum, s) => sum + (s.basePrice ?? 0), 0);
  const hasUnknownFittingPrice = selectedServices.some((s) => s.basePrice === null);
  const estimatedTotal = productSubtotal + knownFittingTotal;

  const hasFitProfile = Boolean(fitProfile);
  const hasSelectedService = selectedServices.length > 0;
  const canContinue =
    !outOfStock && hasFitProfile && hasSelectedService && !confirmed && !isSubmitting;

  const handleContinue = async () => {
    if (!canContinue || !fitProfile) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await cartApi.addItem({
        type: 'BUY_FIT',
        productId: product.id,
        variantId: variant?.id,
        quantity,
        fitProfileId: fitProfile.id,
        selectedFittingServiceIds: [...selectedServiceIds],
        notes: notes || undefined,
      });
      setConfirmed(true);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not add this to your cart.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href={`/marketplace/${slug}`} className={styles.backLink}>
          ← Back to product
        </Link>
        <h1 className={styles.title}>Buy + Fit</h1>

        {outOfStock ? (
          <FormBanner
            variant="error"
            message="This selection is no longer in stock. Go back and choose another option."
          />
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Product</h2>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{product.name}</span>
            <span className={styles.summaryValue}>{formatPrice(unitPrice, product.currency)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Selection</span>
            <span className={styles.summaryValue}>
              {[size, color].filter(Boolean).join(' · ') || 'Standard'}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Quantity</span>
            <span className={styles.summaryValue}>{quantity}</span>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Fit Profile</h2>
          {hasFitProfile ? (
            <>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Using</span>
                <span className={styles.summaryValue}>{fitProfile!.label}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Fit preference</span>
                <span className={styles.summaryValue}>{fitProfile!.fitPreference}</span>
              </div>
              <Link href="/account/fit-profile" className={styles.linkButton}>
                Update fit profile →
              </Link>
            </>
          ) : (
            <>
              <p className={styles.emptyState}>
                You need a Fit Profile with your measurements before continuing with Buy + Fit.
              </p>
              <Link href="/account/fit-profile" className={styles.linkButton}>
                Create fit profile →
              </Link>
            </>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Fitting services</h2>
          {fittingServices.length === 0 ? (
            <p className={styles.emptyState}>
              No fitting services are configured for this product yet.
            </p>
          ) : (
            <div className={styles.serviceList}>
              {fittingServices.map((service) => {
                const missing = missingFor(service);
                const disabled = missing.length > 0;
                return (
                  <label key={service.id} className={styles.serviceRow}>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.has(service.id)}
                      onChange={() => toggleService(service)}
                      disabled={disabled}
                      aria-describedby={disabled ? `${service.id}-missing` : undefined}
                    />
                    <div className={styles.serviceMain}>
                      <div className={styles.serviceName}>{service.name}</div>
                      {service.description ? (
                        <div className={styles.servicePrice}>{service.description}</div>
                      ) : null}
                      <div className={styles.servicePrice}>
                        {service.basePrice !== null
                          ? formatPrice(service.basePrice, product.currency)
                          : 'Pricing not yet available'}
                      </div>
                      {disabled ? (
                        <p
                          id={`${service.id}-missing`}
                          className={styles.serviceMissing}
                          role="alert"
                        >
                          Missing measurements:{' '}
                          {missing.map((k) => MEASUREMENT_LABELS.get(k) ?? k).join(', ')} —{' '}
                          <Link href="/account/fit-profile">update your fit profile</Link>.
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Notes for your tailor</h2>
          <textarea
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="Optional instructions (e.g. preferred alteration style)"
            maxLength={500}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Price preview</h2>
          <div className={styles.priceBreakdown}>
            <div className={styles.priceRow}>
              <span>
                Product ({quantity} × {formatPrice(unitPrice, product.currency)})
              </span>
              <span>{formatPrice(productSubtotal, product.currency)}</span>
            </div>
            <div className={styles.priceRow}>
              <span>Fitting service{selectedServices.length === 1 ? '' : 's'}</span>
              <span>
                {selectedServices.length === 0
                  ? '—'
                  : hasUnknownFittingPrice
                    ? 'Pricing not yet available'
                    : formatPrice(knownFittingTotal, product.currency)}
              </span>
            </div>
            <div className={styles.priceRowTotal}>
              <span>Estimated total</span>
              <span>{formatPrice(estimatedTotal, product.currency)}</span>
            </div>
            {hasUnknownFittingPrice ? (
              <p className={styles.pendingNote}>
                Fitting fees aren&apos;t priced yet — the total above reflects the product only. A
                tailor pricing confirmation will follow.
              </p>
            ) : null}
          </div>
        </section>

        {submitError ? (
          <FormBanner variant="error" message={submitError} onRetry={() => void handleContinue()} />
        ) : null}

        {confirmed ? (
          <>
            <FormBanner variant="success" message="Added to your cart." />
            <div className={styles.actions}>
              <Button href="/cart">View cart</Button>
              <Button href="/marketplace" variant="secondary">
                Continue shopping
              </Button>
            </div>
          </>
        ) : (
          <Button disabled={!canContinue} onClick={() => void handleContinue()}>
            {isSubmitting ? 'Adding to cart…' : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  );
}
