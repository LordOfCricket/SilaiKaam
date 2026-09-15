'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerProfileDto, FitProfileDto } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { fitProfileApi } from '@/features/fit-profile/api';
import { accountApi } from '../api';
import { AddressesSection } from './AddressesSection';
import { ProfileSection } from './ProfileSection';
import styles from './AccountView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const NAV_LINKS = [
  { href: '/orders', label: 'Orders' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/support', label: 'Support' },
];

function FitProfileSummary() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [profile, setProfile] = useState<FitProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await fitProfileApi.get();
      setProfile(data);
      setState('ready');
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not load your Fit Profile. Please try again.',
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Fit Profile</h2>
        <Link href="/account/fit-profile" className={styles.linkButton}>
          {state === 'ready' && profile ? 'View / edit' : 'Create'}
        </Link>
      </div>

      {state === 'loading' ? <p className={styles.rowLabel}>Loading…</p> : null}
      {state === 'error' ? <FormBanner variant="error" message={error ?? ''} onRetry={() => void load()} /> : null}
      {state === 'ready' && !profile ? (
        <p className={styles.rowLabel}>Create your Fit Profile for a better fitting experience.</p>
      ) : null}
      {state === 'ready' && profile ? (
        <dl>
          <div className={styles.row}>
            <dt className={styles.rowLabel}>Fit preference</dt>
            <dd className={styles.rowValue}>{profile.fitPreference}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowLabel}>Measurements saved</dt>
            <dd className={styles.rowValue}>{profile.measurements.length}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

export function AccountView() {
  const router = useRouter();
  const { logout } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await accountApi.getProfile();
      setProfile(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/login?redirect=/account&expired=1');
        return;
      }
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your profile. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading your account…
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

  if (!profile) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Account</h1>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>

        <div className={styles.quickLinks}>
          <Link href="/dashboard" className={styles.quickLink}>
            ← Dashboard
          </Link>
        </div>

        <nav className={styles.navGrid} aria-label="Account sections">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <ProfileSection profile={profile} onUpdated={setProfile} />
        <AddressesSection
          addresses={profile.addresses}
          onChange={(addresses) => setProfile({ ...profile, addresses })}
        />
        <FitProfileSummary />

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Security</h2>
          </div>
          <p className={styles.rowLabel}>
            Password changes aren&apos;t available yet.{' '}
            <a href={`/support?category=ACCOUNT`}>Contact Support</a> if you need help accessing your account.
          </p>
        </section>
      </div>
    </div>
  );
}
