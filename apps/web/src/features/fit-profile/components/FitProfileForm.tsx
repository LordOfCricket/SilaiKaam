'use client';

import { useId, useState, type FormEvent } from 'react';
import type { FitProfileDto, MeasurementKey } from '@silaikaam/types';
import { fitProfileSchema } from '@silaikaam/validation';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { ApiError, NetworkError } from '@/lib/api-client';
import { fieldErrorsFromZod } from '@/lib/zod-errors';
import { fitProfileApi, type UpsertFitProfilePayload } from '../api';
import { FIT_PREFERENCE_OPTIONS, LOWER_BODY_FIELDS, UPPER_BODY_FIELDS } from '../measurementFields';
import formStyles from '../../auth/components/AuthForm.module.css';
import styles from './FitProfileForm.module.css';

type MeasurementValues = Partial<Record<MeasurementKey, string>>;

function toMeasurementValues(profile: FitProfileDto | null): MeasurementValues {
  const values: MeasurementValues = {};
  for (const m of profile?.measurements ?? []) values[m.key] = String(m.value);
  return values;
}

export function FitProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: FitProfileDto | null;
  onSaved: (profile: FitProfileDto) => void;
  onCancel?: () => void;
}) {
  const notesId = useId();
  const [label, setLabel] = useState(profile?.label ?? 'My Fit Profile');
  const [fitPreference, setFitPreference] = useState(profile?.fitPreference ?? 'REGULAR');
  const [notes, setNotes] = useState(profile?.notes ?? '');
  const [measurements, setMeasurements] = useState<MeasurementValues>(toMeasurementValues(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateMeasurement = (key: MeasurementKey) => (e: FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setFormError(null);

    const measurementNumbers: Record<string, number> = {};
    for (const [key, raw] of Object.entries(measurements)) {
      if (raw && raw.trim() !== '') measurementNumbers[key] = Number(raw);
    }

    const parsed = fitProfileSchema.safeParse({
      label,
      fitPreference,
      notes,
      measurements: measurementNumbers,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSaving(true);

    const payload: UpsertFitProfilePayload = {
      label: parsed.data.label,
      fitPreference: parsed.data.fitPreference,
      notes: parsed.data.notes || undefined,
      measurements: Object.entries(parsed.data.measurements)
        .filter((entry): entry is [MeasurementKey, number] => entry[1] !== undefined)
        .map(([key, value]) => ({ key, value })),
    };

    try {
      const saved = await fitProfileApi.upsert(payload);
      onSaved(saved);
    } catch (error) {
      setFormError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      {formError ? (
        <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
      ) : null}

      <FormField
        label="Profile name"
        value={label}
        onChange={(e) => setLabel(e.currentTarget.value)}
        error={fieldErrors.label}
        disabled={isSaving}
      />
      <SelectField
        label="Fit preference"
        options={FIT_PREFERENCE_OPTIONS}
        value={fitPreference}
        onChange={(e) => setFitPreference(e.currentTarget.value as typeof fitPreference)}
        error={fieldErrors.fitPreference}
        disabled={isSaving}
      />

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Upper body (inches)</p>
        <div className={styles.grid}>
          {UPPER_BODY_FIELDS.map(({ key, label: fieldLabel }) => (
            <FormField
              key={key}
              label={fieldLabel}
              type="number"
              step="0.1"
              min={0}
              value={measurements[key] ?? ''}
              onChange={updateMeasurement(key)}
              error={fieldErrors[`measurements.${key}`]}
              disabled={isSaving}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Lower body (inches)</p>
        <div className={styles.grid}>
          {LOWER_BODY_FIELDS.map(({ key, label: fieldLabel }) => (
            <FormField
              key={key}
              label={fieldLabel}
              type="number"
              step="0.1"
              min={0}
              value={measurements[key] ?? ''}
              onChange={updateMeasurement(key)}
              error={fieldErrors[`measurements.${key}`]}
              disabled={isSaving}
            />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label htmlFor={notesId} className={styles.sectionTitle}>
          Notes
        </label>
        <textarea
          id={notesId}
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          disabled={isSaving}
          placeholder="Anything your tailor should know (optional)"
        />
        {fieldErrors.notes ? (
          <p role="alert" className={styles.fieldError}>
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save fit profile'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
