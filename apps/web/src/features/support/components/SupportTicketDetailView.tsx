'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupportTicketDetailDto } from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { supportApi } from '../api';
import styles from './SupportTicketDetailView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const STATUS_LABELS: Record<SupportTicketDetailDto['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_CUSTOMER: 'Waiting for your reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function SupportTicketDetailView({ ticketId }: { ticketId: string }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [ticket, setTicket] = useState<SupportTicketDetailDto | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await supportApi.get(ticketId);
      setTicket(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load this ticket. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!message.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const updated = await supportApi.addMessage(ticketId, message.trim());
      setTicket(updated);
      setMessage('');
    } catch (err) {
      setSendError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not send your message. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    setClosing(true);
    try {
      const updated = await supportApi.close(ticketId);
      setTicket(updated);
    } catch {
      // leave state as-is; the button remains available to retry
    } finally {
      setClosing(false);
    }
  };

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading ticket…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error' || !ticket) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <FormBanner
            variant="error"
            message={loadState.kind === 'error' ? loadState.message : 'Ticket not found.'}
            onRetry={() => void load()}
          />
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{ticket.subject}</h1>
            <p className={styles.meta}>
              {ticket.category} · Opened {new Date(ticket.createdAt).toLocaleDateString()}
              {ticket.orderId ? (
                <>
                  {' · '}
                  <a href={`/orders/${ticket.orderId}`}>Related order</a>
                </>
              ) : null}
            </p>
          </div>
          <span className={styles.status}>{STATUS_LABELS[ticket.status]}</span>
        </div>

        <section className={styles.section}>
          <p className={styles.description}>{ticket.description}</p>
        </section>

        <section className={styles.conversation}>
          <p className={styles.helperNote}>Our support team will respond here.</p>
          {ticket.messages.map((m) => (
            <div key={m.id} className={`${styles.bubble} ${m.senderType === 'CUSTOMER' ? styles.bubbleCustomer : styles.bubbleSupport}`}>
              <p className={styles.bubbleSender}>{m.senderType === 'CUSTOMER' ? 'You' : 'SilaiKaam Support'}</p>
              <p>{m.message}</p>
              <span className={styles.bubbleTime}>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </section>

        {isClosed ? (
          <FormBanner
            variant="error"
            message="This ticket is closed. Open a new ticket if you need further help."
          />
        ) : (
          <section className={styles.replyBox}>
            <label htmlFor="ticket-reply" className={styles.label}>
              Send a message
            </label>
            <textarea
              id="ticket-reply"
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              rows={3}
              disabled={sending}
            />
            {sendError ? <FormBanner variant="error" message={sendError} onRetry={() => void send()} /> : null}
            <div className={styles.replyActions}>
              <Button onClick={() => void send()} disabled={sending || !message.trim()}>
                {sending ? 'Sending…' : 'Send message'}
              </Button>
              <button type="button" className={styles.closeButton} onClick={() => void close()} disabled={closing}>
                {closing ? 'Closing…' : 'Close ticket'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
