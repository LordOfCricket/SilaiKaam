'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { NotificationDto } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { notificationsApi } from '../api';
import styles from './NotificationsListView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

export function NotificationsListView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const result = await notificationsApi.list({ limit: 50 });
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load notifications. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (notification: NotificationDto) => {
    if (notification.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(notification.id);
    } catch {
      void load();
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      void load();
    } finally {
      setMarkingAll(false);
    }
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading notifications…
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
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 ? (
            <button type="button" className={styles.markAllButton} onClick={() => void markAllRead()} disabled={markingAll}>
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((n) => {
              const content = (
                <>
                  <p className={styles.itemTitle}>{n.title}</p>
                  <p className={styles.itemMessage}>{n.message}</p>
                  <span className={styles.itemTime}>{new Date(n.createdAt).toLocaleString()}</span>
                </>
              );
              return (
                <li key={n.id} className={`${styles.item} ${n.isRead ? '' : styles.unread}`}>
                  {n.relatedOrderId ? (
                    <Link href={`/orders/${n.relatedOrderId}`} className={styles.itemLink} onClick={() => void markRead(n)}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className={styles.itemButton} onClick={() => void markRead(n)}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
