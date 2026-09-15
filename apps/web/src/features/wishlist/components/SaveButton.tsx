'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError, NetworkError } from '@/lib/api-client';
import { wishlistApi } from '../api';
import styles from './SaveButton.module.css';

/** Self-contained save/unsave toggle — optimistic with rollback on failure,
 * guest clicks redirect to login preserving the current page. */
export function SaveButton({
  productId,
  initialSaved,
  className,
}: {
  productId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== 'authenticated') {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;

    setError(null);
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      if (next) {
        await wishlistApi.add(productId);
      } else {
        await wishlistApi.remove(productId);
      }
    } catch (err) {
      setSaved(!next); // rollback
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not update your wishlist. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.button} ${saved ? styles.saved : ''} ${className ?? ''}`}
        onClick={(e) => void toggle(e)}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      >
        <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
      </button>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
