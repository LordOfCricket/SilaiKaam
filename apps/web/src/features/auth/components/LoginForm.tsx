'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema } from '@silaikaam/validation';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { FormField } from '@/components/ui/FormField';
import { fieldErrorsFromZod } from '@/lib/zod-errors';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '../api';
import styles from './AuthForm.module.css';

function isSafeRedirect(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export function LoginForm({
  redirectTo,
  initialNotice,
}: {
  redirectTo: string | null;
  initialNotice?: string;
}) {
  const router = useRouter();
  const { setUser } = useAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(initialNotice ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof typeof values) => (e: FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setFormError(null);

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const user = await authApi.login(parsed.data);
      setUser(user);
      const target = redirectTo && isSafeRedirect(redirectTo) ? redirectTo : '/dashboard';
      router.replace(target);
    } catch (error) {
      setIsSubmitting(false);
      if (error instanceof ApiError) {
        setFormError(error.message);
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

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <FormBanner variant="error" message={formError} onRetry={() => void submit()} />
      ) : null}

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
        autoComplete="current-password"
        value={values.password}
        onChange={update('password')}
        error={fieldErrors.password}
        disabled={isSubmitting}
      />

      <Button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
