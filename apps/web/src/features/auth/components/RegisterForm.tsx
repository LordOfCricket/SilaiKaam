'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { registerSchema } from '@silaikaam/validation';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { fieldErrorsFromZod } from '@/lib/zod-errors';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '../api';
import styles from './AuthForm.module.css';

type Status = 'idle' | 'submitting' | 'success';

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const { setUser } = useAuth();

  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const update = (field: keyof typeof values) => (e: FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setStatus('submitting');

    try {
      const user = await authApi.register(parsed.data);
      setUser(user);
      setStatus('success');
      setTimeout(() => router.replace(redirectTo), 500);
    } catch (error) {
      setStatus('idle');
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_ALREADY_REGISTERED') {
          setFieldErrors({ email: 'An account with this email already exists.' });
        } else {
          setFormError(error.message);
        }
      } else if (error instanceof NetworkError) {
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const isSubmitting = status === 'submitting';

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
      ) : null}
      {status === 'success' ? (
        <FormBanner variant="success" message="Account created. Redirecting…" />
      ) : null}

      <FormField
        label="Full name"
        name="fullName"
        autoComplete="name"
        value={values.fullName}
        onChange={update('fullName')}
        error={fieldErrors.fullName}
        disabled={isSubmitting}
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={update('email')}
        error={fieldErrors.email}
        disabled={isSubmitting}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={update('password')}
        error={fieldErrors.password}
        hint={
          !fieldErrors.password
            ? '8+ characters, with an uppercase letter and a number.'
            : undefined
        }
        disabled={isSubmitting}
      />
      <FormField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={update('confirmPassword')}
        error={fieldErrors.confirmPassword}
        disabled={isSubmitting}
      />

      <Button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
