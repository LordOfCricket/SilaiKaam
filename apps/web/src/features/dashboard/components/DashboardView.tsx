'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerProfileDto, FitProfileDto, OrderSummaryDto } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { accountApi } from '@/features/account/api';
import { fitProfileApi } from '@/features/fit-profile/api';
import { ordersApi } from '@/features/orders/api';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import styles from './DashboardView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

interface QuickAction {
  title: string;
  subtitle: string;
  href?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Marketplace', subtitle: 'Browse clothing to buy', href: '/marketplace' },
  { title: 'Buy + Fit', subtitle: 'Shop, then get it fitted', href: '/marketplace' },
  { title: 'Existing Garment', subtitle: 'Fit a garment you own', href: '/existing-garment' },
  { title: 'Custom Stitching', subtitle: 'Made from scratch, to order', href: '/custom-stitching' },
  { title: 'Cart', subtitle: 'Review what you’ve added', href: '/cart' },
  { title: 'My Orders', subtitle: 'Track what you’ve ordered', href: '/orders' },
];

export function DashboardView() {
  const router = useRouter();
  const { logout } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [fitProfile, setFitProfile] = useState<FitProfileDto | null>(null);
  const [fitProfileError, setFitProfileError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await accountApi.getProfile();
      setProfile(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/login?redirect=/dashboard&expired=1');
        return;
      }
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your dashboard. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [router]);

  const loadFitProfile = useCallback(async () => {
    setFitProfileError(null);
    try {
      const data = await fitProfileApi.get();
      setFitProfile(data ?? null);
    } catch (error) {
      setFitProfileError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your fit profile.',
      );
    }
  }, []);

  useEffect(() => {
    void load();
    void loadFitProfile();
    ordersApi
      .list()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [load, loadFitProfile]);

  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading your dashboard…
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

  const firstName = profile.fullName.split(' ')[0];
  const checklist = [
    { label: 'Basic profile info', done: true },
    { label: 'Delivery address', done: profile.addresses.length > 0 },
    { label: 'Fit profile', done: Boolean(fitProfile) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>Welcome back, {firstName}</h1>
            <p className={styles.subGreeting}>Here&apos;s where you left off.</p>
          </div>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Your account</h2>
            <ul className={styles.checklist}>
              {checklist.map((item) => (
                <li key={item.label} className={styles.checklistItem}>
                  <span className={item.done ? styles.checkDone : styles.checkPending}>
                    {item.done ? '✓' : '○'}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
            <Link href="/account" className={styles.linkButton}>
              Manage account →
            </Link>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Fit profile</h2>
            {fitProfileError ? (
              <FormBanner
                variant="error"
                message={fitProfileError}
                onRetry={() => void loadFitProfile()}
              />
            ) : fitProfile ? (
              <p className={styles.emptyState}>
                <strong>{fitProfile.label}</strong> — {fitProfile.fitPreference.toLowerCase()} fit,{' '}
                {fitProfile.measurements.length} measurement
                {fitProfile.measurements.length === 1 ? '' : 's'} saved.
              </p>
            ) : (
              <p className={styles.emptyState}>
                You haven&apos;t set up your fit profile yet. Save it once and reuse it for Buy +
                Fit and Existing Garment fitting.
              </p>
            )}
            <Link href="/account/fit-profile" className={styles.linkButton}>
              {fitProfile ? 'View / edit fit profile →' : 'Create fit profile →'}
            </Link>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Active orders</h2>
            {activeOrders.length === 0 ? (
              <p className={styles.emptyState}>
                No active orders yet.
                <br />
                Start shopping or fit a garment you already own.
              </p>
            ) : (
              <p className={styles.emptyState}>
                {activeOrders.length} order{activeOrders.length === 1 ? '' : 's'} in progress.
              </p>
            )}
            <Link href="/orders" className={styles.linkButton}>
              View my orders →
            </Link>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent activity</h2>
            <p className={styles.emptyState}>No recent activity yet.</p>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Quick actions</h2>
          <div className={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) =>
              action.href ? (
                <Link key={action.title} href={action.href} className={styles.actionCard}>
                  <div className={styles.actionTitle}>{action.title}</div>
                  <div className={styles.actionSubtitle}>{action.subtitle}</div>
                </Link>
              ) : (
                <div key={action.title} className={styles.actionCardDisabled} aria-disabled="true">
                  <div className={styles.actionTitle}>{action.title}</div>
                  <div className={styles.actionSubtitle}>{action.subtitle}</div>
                  <span className={styles.badge}>Coming soon</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
