'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FitProfileDto,
  FittingServiceDto,
  GarmentCondition,
  MeasurementKey,
} from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { ImagePicker, type PickedImage } from '@/components/ui/ImagePicker';
import { SelectField } from '@/components/ui/SelectField';
import { cartApi } from '@/features/cart/api';
import { existingGarmentApi } from '@/features/existing-garment/api';
import { fitProfileApi } from '@/features/fit-profile/api';
import { LOWER_BODY_FIELDS, UPPER_BODY_FIELDS } from '@/features/fit-profile/measurementFields';
import { marketplaceApi } from '@/features/marketplace/api';
import { ApiError, NetworkError } from '@/lib/api-client';
import { fileToBase64 } from '@/lib/file-to-base64';
import formStyles from '../../auth/components/AuthForm.module.css';
import styles from './ExistingGarmentForm.module.css';

const MEASUREMENT_LABELS = new Map(
  [...UPPER_BODY_FIELDS, ...LOWER_BODY_FIELDS].map((f) => [f.key, f.label]),
);

const CONDITION_OPTIONS = [
  { value: 'NEW', label: 'New / barely worn' },
  { value: 'GOOD', label: 'Good condition' },
  { value: 'WORN', label: 'Worn' },
  { value: 'DAMAGED', label: 'Damaged' },
];

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export function ExistingGarmentForm() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [fittingServices, setFittingServices] = useState<FittingServiceDto[]>([]);
  const [fitProfile, setFitProfile] = useState<FitProfileDto | null>(null);

  const [garmentType, setGarmentType] = useState('');
  const [brand, setBrand] = useState('');
  const [currentSize, setCurrentSize] = useState('');
  const [condition, setCondition] = useState<GarmentCondition>('GOOD');
  const [notes, setNotes] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [frontPhoto, setFrontPhoto] = useState<PickedImage[]>([]);
  const [backPhoto, setBackPhoto] = useState<PickedImage[]>([]);
  const [areaPhoto, setAreaPhoto] = useState<PickedImage[]>([]);
  const [damagePhoto, setDamagePhoto] = useState<PickedImage[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const services = await marketplaceApi.listAllFittingServices();
      setFittingServices(services);
      try {
        const profile = await fitProfileApi.get();
        setFitProfile(profile ?? null);
      } catch {
        setFitProfile(null);
      }
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

  const selectedServices = fittingServices.filter((s) => selectedServiceIds.has(s.id));

  const submit = async () => {
    setFormError(null);
    const errors: Record<string, string> = {};
    if (garmentType.trim().length < 2) errors.garmentType = 'Garment type is required.';
    if (frontPhoto.length === 0) errors.photos = 'A front photo of the garment is required.';
    if (selectedServiceIds.size === 0) errors.services = 'Select at least one fitting requirement.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const photos = await Promise.all([
        ...frontPhoto.map(async (p) => ({
          role: 'FRONT' as const,
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        })),
        ...backPhoto.map(async (p) => ({
          role: 'BACK' as const,
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        })),
        ...areaPhoto.map(async (p) => ({
          role: 'AREA' as const,
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        })),
        ...damagePhoto.map(async (p) => ({
          role: 'DAMAGE' as const,
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        })),
      ]);

      const created = await existingGarmentApi.create({
        garmentType: garmentType.trim(),
        brand: brand.trim() || undefined,
        currentSize: currentSize.trim() || undefined,
        condition,
        notes: notes.trim() || undefined,
        fitProfileId: fitProfile?.id,
        selectedFittingServiceIds: [...selectedServiceIds],
        photos,
      });

      await cartApi.addItem({ type: 'EXISTING_GARMENT', existingGarmentRequestId: created.id });
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
          <h1 className={styles.title}>Existing Garment Fitting</h1>
          <FormBanner
            variant="success"
            message="Your fitting request has been added to your cart."
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
        <h1 className={styles.title}>Existing Garment Fitting</h1>

        {formError ? (
          <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Garment details</h2>
          <div className={formStyles.form}>
            <FormField
              label="Garment type"
              placeholder="e.g. Shirt, Trousers, Kurta"
              value={garmentType}
              onChange={(e) => setGarmentType(e.currentTarget.value)}
              error={fieldErrors.garmentType}
              disabled={isSubmitting}
            />
            <FormField
              label="Brand (optional)"
              value={brand}
              onChange={(e) => setBrand(e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <FormField
              label="Current size (optional)"
              value={currentSize}
              onChange={(e) => setCurrentSize(e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <SelectField
              label="Condition"
              options={CONDITION_OPTIONS}
              value={condition}
              onChange={(e) => setCondition(e.currentTarget.value as GarmentCondition)}
              disabled={isSubmitting}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Photos</h2>
          <div className={styles.photoGrid}>
            <ImagePicker
              label="Front (required)"
              images={frontPhoto}
              onChange={setFrontPhoto}
              disabled={isSubmitting}
              error={fieldErrors.photos}
            />
            <ImagePicker
              label="Back (optional)"
              images={backPhoto}
              onChange={setBackPhoto}
              disabled={isSubmitting}
            />
            <ImagePicker
              label="Area of concern (optional)"
              images={areaPhoto}
              onChange={setAreaPhoto}
              disabled={isSubmitting}
            />
            <ImagePicker
              label="Damage evidence (optional)"
              images={damagePhoto}
              onChange={setDamagePhoto}
              disabled={isSubmitting}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Fitting requirements</h2>
          {fieldErrors.services ? (
            <p className={styles.serviceMissing}>{fieldErrors.services}</p>
          ) : null}
          {fittingServices.length === 0 ? (
            <p className={styles.emptyState}>No fitting services are configured yet.</p>
          ) : (
            <div className={styles.serviceList}>
              {fittingServices.map((service) => {
                const missing = missingFor(service);
                const disabled = missing.length > 0 || isSubmitting;
                return (
                  <label key={service.id} className={styles.serviceRow}>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.has(service.id)}
                      onChange={() => toggleService(service)}
                      disabled={disabled}
                    />
                    <div>
                      <div className={styles.serviceName}>{service.name}</div>
                      {service.description ? (
                        <div className={styles.emptyState}>{service.description}</div>
                      ) : null}
                      {missing.length > 0 ? (
                        <p className={styles.serviceMissing} role="alert">
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
          <h2 className={styles.cardTitle}>Fit Profile</h2>
          {fitProfile ? (
            <p className={styles.emptyState}>Using &quot;{fitProfile.label}&quot;.</p>
          ) : (
            <p className={styles.emptyState}>
              No Fit Profile yet. Some fitting requirements may be unavailable until you{' '}
              <Link href="/account/fit-profile">create one</Link>.
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Notes</h2>
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
            <span className={styles.summaryLabel}>Photos</span>
            <span className={styles.summaryValue}>
              {frontPhoto.length + backPhoto.length + areaPhoto.length + damagePhoto.length}{' '}
              uploaded
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Fitting requirements</span>
            <span className={styles.summaryValue}>
              {selectedServices.map((s) => s.name).join(', ') || '—'}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Pricing</span>
            <span className={styles.summaryValue}>Pricing will be confirmed</span>
          </div>
        </section>

        <Button onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Add to cart'}
        </Button>
      </div>
    </div>
  );
}
