'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { SupportCategory, SupportTicketSummaryDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { supportApi } from '../api';
import styles from './SupportListView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'ORDER', label: 'Order' },
  { value: 'FITTING', label: 'Fitting' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_LABELS: Record<SupportTicketSummaryDto['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_CUSTOMER: 'Waiting for your reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function SupportListView() {
  const searchParams = useSearchParams();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [tickets, setTickets] = useState<SupportTicketSummaryDto[]>([]);
  const [showForm, setShowForm] = useState(Boolean(searchParams.get('orderId') || searchParams.get('category')));

  const [category, setCategory] = useState<SupportCategory>(
    (searchParams.get('category') as SupportCategory) || 'OTHER',
  );
  const [orderId] = useState(searchParams.get('orderId') ?? '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await supportApi.list();
      setTickets(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load your support tickets. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (subject.trim().length < 3 || description.trim().length < 10) {
      setFormError('Please add a subject (3+ characters) and a description (10+ characters).');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await supportApi.create({
        category,
        orderId: orderId || undefined,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSubject('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not create your ticket. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Support</h1>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>New ticket</Button>
          ) : null}
        </div>

        {showForm ? (
          <section className={styles.form}>
            <h2 className={styles.formTitle}>Contact support</h2>
            {orderId ? <p className={styles.orderNote}>Regarding order #{orderId.slice(0, 8)}</p> : null}

            <label className={styles.label} htmlFor="support-category">
              Category
            </label>
            <select
              id="support-category"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value as SupportCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className={styles.label} htmlFor="support-subject">
              Subject
            </label>
            <input
              id="support-subject"
              className={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              maxLength={120}
            />

            <label className={styles.label} htmlFor="support-description">
              Description
            </label>
            <textarea
              id="support-description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              rows={4}
              maxLength={2000}
            />

            {formError ? <FormBanner variant="error" message={formError} onRetry={() => void submit()} /> : null}

            <div className={styles.formActions}>
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </Button>
              <button type="button" className={styles.cancelButton} onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        {loadState.kind === 'loading' ? (
          <div className={styles.centerState} role="status" aria-live="polite">
            Loading tickets…
          </div>
        ) : loadState.kind === 'error' ? (
          <FormBanner variant="error" message={loadState.message} onRetry={() => void load()} />
        ) : tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Need help? Start a support request.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/support/${t.id}`} className={styles.item}>
                  <div>
                    <p className={styles.itemSubject}>{t.subject}</p>
                    <p className={styles.itemMeta}>
                      {CATEGORIES.find((c) => c.value === t.category)?.label} · {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={styles.status}>{STATUS_LABELS[t.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
