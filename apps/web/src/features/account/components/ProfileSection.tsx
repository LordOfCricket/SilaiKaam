'use client';

import { useState, type FormEvent } from 'react';
import type { CustomerProfileDto } from '@silaikaam/types';
import { updateProfileSchema } from '@silaikaam/validation';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { ApiError, NetworkError } from '@/lib/api-client';
import { fieldErrorsFromZod } from '@/lib/zod-errors';
import { accountApi } from '../api';
import styles from './AccountView.module.css';
import formStyles from '../../auth/components/AuthForm.module.css';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function toEditValues(profile: CustomerProfileDto) {
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile.gender ?? '',
    avatarUrl: profile.avatarUrl ?? '',
  };
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value.trim();
}

export function ProfileSection({
  profile,
  onUpdated,
}: {
  profile: CustomerProfileDto;
  onUpdated: (profile: CustomerProfileDto) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState(toEditValues(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const startEditing = () => {
    setValues(toEditValues(profile));
    setFieldErrors({});
    setFormError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFieldErrors({});
    setFormError(null);
  };

  const update =
    (field: keyof typeof values) => (e: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.currentTarget.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const submit = async () => {
    setFormError(null);
    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSaving(true);

    try {
      const updated = await accountApi.updateProfile({
        fullName: parsed.data.fullName,
        phone: emptyToUndefined(parsed.data.phone ?? ''),
        dateOfBirth: emptyToUndefined(parsed.data.dateOfBirth ?? ''),
        gender: emptyToUndefined(parsed.data.gender ?? ''),
        avatarUrl: emptyToUndefined(parsed.data.avatarUrl ?? ''),
      });
      onUpdated(updated);
      setIsEditing(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Profile</h2>
        {!isEditing ? (
          <button type="button" className={styles.linkButton} onClick={startEditing}>
            Edit
          </button>
        ) : null}
      </div>

      {savedMessage ? <FormBanner variant="success" message="Profile updated." /> : null}
      {formError ? (
        <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
      ) : null}

      {!isEditing ? (
        <dl>
          <ProfileRow label="Full name" value={profile.fullName} />
          <ProfileRow label="Email" value={profile.email} />
          <ProfileRow label="Phone" value={profile.phone ?? '—'} />
          <ProfileRow
            label="Date of birth"
            value={profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '—'}
          />
          <ProfileRow
            label="Gender"
            value={GENDER_OPTIONS.find((o) => o.value === profile.gender)?.label ?? '—'}
          />
        </dl>
      ) : (
        <form className={formStyles.form} onSubmit={onSubmit} noValidate>
          <FormField
            label="Full name"
            value={values.fullName}
            onChange={update('fullName')}
            error={fieldErrors.fullName}
            disabled={isSaving}
          />
          <FormField
            label="Email"
            value={profile.email}
            disabled
            hint="Email can't be changed yet."
          />
          <FormField
            label="Phone"
            value={values.phone}
            onChange={update('phone')}
            error={fieldErrors.phone}
            disabled={isSaving}
          />
          <FormField
            label="Date of birth"
            type="date"
            value={values.dateOfBirth}
            onChange={update('dateOfBirth')}
            error={fieldErrors.dateOfBirth}
            disabled={isSaving}
          />
          <SelectField
            label="Gender"
            placeholder="Select…"
            options={GENDER_OPTIONS}
            value={values.gender}
            onChange={update('gender')}
            error={fieldErrors.gender}
            disabled={isSaving}
          />

          <div className={styles.actions}>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={styles.rowValue}>{value}</dd>
    </div>
  );
}
