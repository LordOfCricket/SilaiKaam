'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { FitProfileDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { fitProfileApi } from '../api';
import { FIT_PREFERENCE_OPTIONS, LOWER_BODY_FIELDS, UPPER_BODY_FIELDS } from '../measurementFields';
import { FitProfileForm } from './FitProfileForm';
import styles from './FitProfileView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const ALL_FIELDS = [...UPPER_BODY_FIELDS, ...LOWER_BODY_FIELDS];

export function FitProfileView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [profile, setProfile] = useState<FitProfileDto | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await fitProfileApi.get();
      setProfile(data ?? null);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your fit profile. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (saved: FitProfileDto) => {
    setProfile(saved);
    setIsEditing(false);
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading your fit profile…
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/dashboard" className={styles.backLink}>
              ← Dashboard
            </Link>
            <h1 className={styles.title}>My Fit Profile</h1>
          </div>
        </div>

        {!profile && !isEditing ? (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p>
                No fit profile yet. Save your measurements once and reuse them for Buy + Fit and
                Existing Garment fitting.
              </p>
              <Button onClick={() => setIsEditing(true)}>Create fit profile</Button>
            </div>
          </div>
        ) : isEditing ? (
          <div className={styles.card}>
            <FitProfileForm
              profile={profile}
              onSaved={handleSaved}
              onCancel={profile ? () => setIsEditing(false) : undefined}
            />
          </div>
        ) : profile ? (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>{profile.label}</h2>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Fit preference</span>
              <span className={styles.rowValue}>
                {FIT_PREFERENCE_OPTIONS.find((o) => o.value === profile.fitPreference)?.label}
              </span>
            </div>
            {ALL_FIELDS.map(({ key, label }) => {
              const measurement = profile.measurements.find((m) => m.key === key);
              if (!measurement) return null;
              return (
                <div className={styles.row} key={key}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.rowValue}>
                    {measurement.value} {measurement.unit}
                  </span>
                </div>
              );
            })}
            {profile.measurements.length === 0 ? (
              <p className={styles.rowLabel}>No measurements entered yet.</p>
            ) : null}
            {profile.notes ? (
              <div className={styles.row}>
                <span className={styles.rowLabel}>Notes</span>
                <span className={styles.rowValue}>{profile.notes}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
