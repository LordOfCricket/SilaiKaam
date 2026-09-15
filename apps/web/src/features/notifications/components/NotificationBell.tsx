'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationDto } from '@silaikaam/types';
import { useAuth } from '@/providers/AuthProvider';
import { notificationsApi } from '../api';
import styles from './NotificationBell.module.css';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list({ limit: 8 });
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      // best-effort UI — a failed refresh just leaves the previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') void load();
  }, [status, load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (status !== 'authenticated') return null;

  const markRead = async (notification: NotificationDto) => {
    if (notification.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(notification.id);
    } catch {
      void load(); // resync with the server on failure
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className={styles.panel} role="region" aria-label="Notifications">
          <div className={styles.panelHeader}>
            <span>Notifications</span>
            <Link href="/notifications" className={styles.viewAll} onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>You&apos;re all caught up.</p>
          ) : (
            <ul className={styles.list}>
              {items.map((n) => {
                const content = (
                  <>
                    <p className={styles.itemTitle}>{n.title}</p>
                    <p className={styles.itemMessage}>{n.message}</p>
                    <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                  </>
                );
                return (
                  <li key={n.id} className={`${styles.item} ${n.isRead ? '' : styles.unread}`}>
                    {n.relatedOrderId ? (
                      <Link
                        href={`/orders/${n.relatedOrderId}`}
                        className={styles.itemLink}
                        onClick={() => {
                          void markRead(n);
                          setOpen(false);
                        }}
                      >
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
      ) : null}
    </div>
  );
}
