'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerProfileDto } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { accountApi } from '../api';
import { AddressesSection } from './AddressesSection';
import { ProfileSection } from './ProfileSection';
import styles from './AccountView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

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
          <Link href="/account/fit-profile" className={styles.quickLink}>
            My Fit Profile →
          </Link>
        </div>

        <ProfileSection profile={profile} onUpdated={setProfile} />
        <AddressesSection
          addresses={profile.addresses}
          onChange={(addresses) => setProfile({ ...profile, addresses })}
        />
      </div>
    </div>
  );
}
