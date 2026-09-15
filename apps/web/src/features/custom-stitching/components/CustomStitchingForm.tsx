'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { FitProfileDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { ImagePicker, type PickedImage } from '@/components/ui/ImagePicker';
import { cartApi } from '@/features/cart/api';
import { customStitchingApi } from '@/features/custom-stitching/api';
import { fitProfileApi } from '@/features/fit-profile/api';
import { ApiError, NetworkError } from '@/lib/api-client';
import { fileToBase64 } from '@/lib/file-to-base64';
import formStyles from '../../auth/components/AuthForm.module.css';
import styles from './CustomStitchingForm.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export function CustomStitchingForm() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [fitProfile, setFitProfile] = useState<FitProfileDto | null>(null);

  const [garmentType, setGarmentType] = useState('');
  const [fabricDetails, setFabricDetails] = useState('');
  const [designDetails, setDesignDetails] = useState('');
  const [color, setColor] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceImages, setReferenceImages] = useState<PickedImage[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const profile = await fitProfileApi.get();
      setFitProfile(profile ?? null);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      setLoadState({
        kind: 'error',
        message:
          error instanceof ApiError || error instanceof NetworkError
            ? error.message
            : 'Could not load this page. Please try again.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading…
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

  const submit = async () => {
    setFormError(null);
    if (garmentType.trim().length < 2) {
      setFieldErrors({ garmentType: 'Garment type is required.' });
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const images = await Promise.all(
        referenceImages.map(async (p) => ({
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        })),
      );

      const created = await customStitchingApi.create({
        garmentType: garmentType.trim(),
        fabricDetails: fabricDetails.trim() || undefined,
        designDetails: designDetails.trim() || undefined,
        color: color.trim() || undefined,
        specialRequirements: specialRequirements.trim() || undefined,
        notes: notes.trim() || undefined,
        fitProfileId: fitProfile?.id,
        referenceImages: images,
      });

      await cartApi.addItem({ type: 'CUSTOM_STITCHING', customStitchingRequestId: created.id });
      setSubmitted(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Custom Stitching</h1>
          <FormBanner
            variant="success"
            message="Your custom stitching request has been added to your cart."
          />
          <div className={styles.actions}>
            <Button href="/cart">View cart</Button>
            <Button href="/dashboard" variant="secondary">
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Dashboard
        </Link>
        <h1 className={styles.title}>Custom Stitching</h1>

        {formError ? (
          <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Garment &amp; design details</h2>
          <div className={formStyles.form}>
            <FormField
              label="Garment type"
              placeholder="e.g. Blouse, Sherwani, Dress"
              value={garmentType}
              onChange={(e) => setGarmentType(e.currentTarget.value)}
              error={fieldErrors.garmentType}
              disabled={isSubmitting}
            />
            <FormField
              label="Fabric (optional)"
              value={fabricDetails}
              onChange={(e) => setFabricDetails(e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <FormField
              label="Design/style (optional)"
              value={designDetails}
              onChange={(e) => setDesignDetails(e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <FormField
              label="Color (optional)"
              value={color}
              onChange={(e) => setColor(e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <FormField
              label="Special requirements (optional)"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.currentTarget.value)}
              disabled={isSubmitting}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Reference images (optional)</h2>
          <ImagePicker
            label="Reference images"
            images={referenceImages}
            onChange={setReferenceImages}
            maxFiles={6}
            disabled={isSubmitting}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Fit Profile</h2>
          {fitProfile ? (
            <p className={styles.emptyState}>Using &quot;{fitProfile.label}&quot;.</p>
          ) : (
            <p className={styles.emptyState}>
              No Fit Profile yet. You can <Link href="/account/fit-profile">create one</Link> now or
              add it later.
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Instructions</h2>
          <textarea
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="Anything your tailor should know (optional)"
            maxLength={500}
            disabled={isSubmitting}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Review</h2>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Garment</span>
            <span className={styles.summaryValue}>{garmentType || '—'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>References</span>
            <span className={styles.summaryValue}>{referenceImages.length} uploaded</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Pricing</span>
            <span className={styles.summaryValue}>
              <span className={styles.quoteBadge}>Quote required</span>
            </span>
          </div>
        </section>

        <Button onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Add to cart'}
        </Button>
      </div>
    </div>
  );
}
