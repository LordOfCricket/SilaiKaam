'use client';

import { useState, type FormEvent } from 'react';
import type { AddressDto } from '@silaikaam/types';
import { addressSchema } from '@silaikaam/validation';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { fieldErrorsFromZod } from '@/lib/zod-errors';
import { ApiError, NetworkError } from '@/lib/api-client';
import formStyles from '../../auth/components/AuthForm.module.css';
import styles from './AddressCard.module.css';

type AddressFormValues = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

function toValues(address?: AddressDto): AddressFormValues {
  return {
    label: address?.label ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? 'IN',
    isDefault: address?.isDefault ?? false,
  };
}

export function AddressForm({
  address,
  onSubmit,
  onCancel,
}: {
  address?: AddressDto;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<AddressFormValues>(toValues(address));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field: keyof AddressFormValues) => (e: FormEvent<HTMLInputElement>) => {
    const value =
      e.currentTarget.type === 'checkbox' ? e.currentTarget.checked : e.currentTarget.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setFormError(null);
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSubmit(values);
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
        label="Label (e.g. Home, Work)"
        value={values.label}
        onChange={update('label')}
        disabled={isSaving}
      />
      <FormField
        label="Address line 1"
        value={values.line1}
        onChange={update('line1')}
        error={fieldErrors.line1}
        disabled={isSaving}
      />
      <FormField
        label="Address line 2"
        value={values.line2}
        onChange={update('line2')}
        disabled={isSaving}
      />
      <FormField
        label="City"
        value={values.city}
        onChange={update('city')}
        error={fieldErrors.city}
        disabled={isSaving}
      />
      <FormField
        label="State"
        value={values.state}
        onChange={update('state')}
        error={fieldErrors.state}
        disabled={isSaving}
      />
      <FormField
        label="Postal code"
        value={values.postalCode}
        onChange={update('postalCode')}
        error={fieldErrors.postalCode}
        disabled={isSaving}
      />
      <FormField
        label="Country"
        value={values.country}
        onChange={update('country')}
        disabled={isSaving}
      />

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={update('isDefault')}
          disabled={isSaving}
        />
        Set as default address
      </label>

      <div className={styles.actions}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save address'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
