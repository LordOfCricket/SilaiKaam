'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ORDER_STATUS_LABEL,
  type CancellationReason,
  type DisputeType,
  type OrderDetailDto,
  type OrderItemDto,
  type OrderStatus,
  type ReviewDto,
  type ReviewTargetType,
} from '@silaikaam/types';
import { Button } from '@/components/ui/Button';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { ordersApi } from '../api';
import styles from './OrderDetailView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const ITEM_TYPE_LABELS: Record<OrderItemDto['type'], string> = {
  PRODUCT_ONLY: 'Product',
  PRODUCT_WITH_FITTING: 'Buy + Fit',
  EXISTING_GARMENT_FITTING: 'Existing Garment Fitting',
  CUSTOM_STITCHING: 'Custom Stitching',
};


// Branch/side-states — shown as a banner rather than a linear timeline step
// (the timeline still highlights the last real forward progress via
// `currentStepIndex`, which the backend computes for exactly this case).
const SIDE_STATES: OrderStatus[] = ['CANCELLED', 'DELIVERY_FAILED', 'DELIVERY_RESCHEDULED'];

const REVIEW_LABELS: Record<ReviewTargetType, string> = {
  PRODUCT: 'Rate your product',
  FITTING: 'How was your fitting experience?',
  CUSTOM_STITCHING: 'Rate your stitching service',
};

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  CUSTOMER_CHANGED_MIND: 'I changed my mind',
  ORDERED_BY_MISTAKE: 'I ordered this by mistake',
  DELIVERY_TOO_LATE: 'Delivery is taking too long',
  WRONG_ITEM: 'I selected the wrong item',
  OTHER: 'Other',
};

const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  FIT_ISSUE: 'Fit issue',
  DAMAGED_ITEM: 'Item arrived damaged',
  WRONG_ITEM: 'Wrong item received',
  MISSING_ITEM: 'Item missing from order',
  QUALITY_ISSUE: 'Quality issue',
  DELIVERY_ISSUE: 'Delivery issue',
  OTHER: 'Other',
};

const REFUND_STATUS_TEXT: Record<string, string> = {
  PENDING: 'Refund request recorded',
  PROCESSING: 'Refund is being processed',
  SUCCEEDED: 'Refund completed',
  FAILED: 'Refund could not be completed',
  CANCELLED: 'Refund request cancelled',
};

function CancelOrderSection({ order, onCancelled }: { order: OrderDetailDto; onCancelled: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<CancellationReason>('CUSTOMER_CHANGED_MIND');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await ordersApi.cancel(order.id, reason, note.trim() || undefined);
      onCancelled();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not cancel this order. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!order.cancellationEligibility.eligible) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cancellation</h2>
        <p className={styles.itemMeta}>{order.cancellationEligibility.reason}</p>
        <a href={`/support?category=ORDER&orderId=${order.id}`} className={styles.linkButton}>
          Contact Support
        </a>
      </section>
    );
  }

  if (!showForm) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cancellation</h2>
        <p className={styles.itemMeta}>{order.cancellationEligibility.reason}</p>
        <button type="button" className={styles.reviewCta} onClick={() => setShowForm(true)}>
          Cancel Order
        </button>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Cancel this order</h2>
      <label className={styles.actionLabel} htmlFor="cancel-reason">
        Reason
      </label>
      <select
        id="cancel-reason"
        className={styles.actionTextarea}
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value as CancellationReason)}
        disabled={submitting}
      >
        {Object.entries(CANCELLATION_REASON_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className={styles.actionLabel} htmlFor="cancel-note">
        Additional note (optional)
      </label>
      <textarea
        id="cancel-note"
        className={styles.actionTextarea}
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        rows={2}
        disabled={submitting}
      />
      {error ? <FormBanner variant="error" message={error} onRetry={() => void submit()} /> : null}
      <div className={styles.reorderRow}>
        <Button onClick={() => void submit()} disabled={submitting}>
          {submitting ? 'Cancelling…' : 'Confirm cancellation'}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setShowForm(false)} disabled={submitting}>
          Never mind
        </button>
      </div>
    </section>
  );
}

function DisputeSection({ order, onCreated }: { order: OrderDetailDto; onCreated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DisputeType>('OTHER');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (description.trim().length < 10) {
      setError('Please describe the issue in a bit more detail (10+ characters).');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await ordersApi.createDispute(order.id, { type, description: description.trim() });
      setDescription('');
      setShowForm(false);
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not submit your report. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Issues reported</h2>

      {order.disputes.length > 0 ? (
        <div className={styles.list}>
          {order.disputes.map((d) => (
            <div key={d.id} className={styles.item}>
              <div>
                <p className={styles.itemType}>{DISPUTE_TYPE_LABELS[d.type]}</p>
                <p className={styles.itemMeta}>{d.description}</p>
                {d.resolution ? <p className={styles.fittingMessage}>{d.resolution}</p> : null}
              </div>
              <span className={styles.status}>{d.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!showForm ? (
        <button type="button" className={styles.reviewCta} onClick={() => setShowForm(true)}>
          Report an Issue
        </button>
      ) : (
        <div className={styles.reviewForm}>
          <label className={styles.actionLabel} htmlFor="dispute-type">
            Issue type
          </label>
          <select
            id="dispute-type"
            className={styles.actionTextarea}
            value={type}
            onChange={(e) => setType(e.currentTarget.value as DisputeType)}
            disabled={submitting}
          >
            {Object.entries(DISPUTE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className={styles.actionLabel} htmlFor="dispute-description">
            Description
          </label>
          <textarea
            id="dispute-description"
            className={styles.actionTextarea}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={3}
            disabled={submitting}
          />
          {error ? <FormBanner variant="error" message={error} onRetry={() => void submit()} /> : null}
          <div className={styles.reorderRow}>
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
            <button type="button" className={styles.linkButton} onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
          </div>
          <p className={styles.itemMeta}>
            You can discuss this further any time via{' '}
            <a href={`/support?category=ORDER&orderId=${order.id}`}>Support</a>.
          </p>
        </div>
      )}
    </section>
  );
}

function itemName(item: OrderItemDto): string {
  if (item.product?.name) return item.product.name;
  if (item.existingGarment) return item.existingGarment.garmentType;
  if (item.customStitching) return item.customStitching.garmentType;
  return 'Item';
}

function ActionRequiredForm({
  orderId,
  actionRequestId,
  requestedInfo,
  onResolved,
}: {
  orderId: string;
  actionRequestId: string;
  requestedInfo: string;
  onResolved: () => void;
}) {
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!responseText.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await ordersApi.respondToActionRequest(orderId, actionRequestId, responseText.trim());
      setDone(true);
      onResolved();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not submit your response. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className={styles.actionDone} role="status">
        Thanks — we&apos;ve received your response and will continue shortly.
      </p>
    );
  }

  return (
    <div className={styles.actionRequired} role="region" aria-label="Action required">
      <p className={styles.actionTitle}>Action needed</p>
      <p className={styles.actionInfo}>{requestedInfo}</p>
      <label htmlFor={`action-${actionRequestId}`} className={styles.actionLabel}>
        Your response
      </label>
      <textarea
        id={`action-${actionRequestId}`}
        className={styles.actionTextarea}
        value={responseText}
        onChange={(e) => setResponseText(e.currentTarget.value)}
        disabled={submitting}
        rows={3}
      />
      {error ? <FormBanner variant="error" message={error} onRetry={() => void submit()} /> : null}
      <Button onClick={() => void submit()} disabled={submitting || !responseText.trim()}>
        {submitting ? 'Submitting…' : 'Submit response'}
      </Button>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.starRow} role="radiogroup" aria-label="Rating out of 5 stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={`${styles.star} ${n <= value ? styles.starFilled : ''}`}
          onClick={() => onChange(n)}
          disabled={disabled}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewCta({
  orderId,
  orderItemId,
  targetType,
  existingReview,
  onSaved,
}: {
  orderId: string;
  orderItemId: string;
  targetType: ReviewTargetType;
  existingReview: ReviewDto | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError('Please select a rating.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (existingReview) {
        await ordersApi.updateReview(orderId, existingReview.id, { rating, comment: comment || undefined });
      } else {
        await ordersApi.createReview(orderId, { orderItemId, targetType, rating, comment: comment || undefined });
      }
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not save your review. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing && existingReview) {
    return (
      <div className={styles.reviewDone}>
        <span
          className={styles.reviewStars}
          aria-label={`You rated this ${existingReview.rating} out of 5 stars`}
        >
          {'★'.repeat(existingReview.rating)}
          {'☆'.repeat(5 - existingReview.rating)}
        </span>
        {existingReview.comment ? <p className={styles.itemMeta}>&ldquo;{existingReview.comment}&rdquo;</p> : null}
        <button type="button" className={styles.linkButton} onClick={() => setEditing(true)}>
          Edit review
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button type="button" className={styles.reviewCta} onClick={() => setEditing(true)}>
        {REVIEW_LABELS[targetType]}
      </button>
    );
  }

  return (
    <div className={styles.reviewForm} role="region" aria-label={REVIEW_LABELS[targetType]}>
      <p className={styles.actionTitle}>{REVIEW_LABELS[targetType]}</p>
      <StarRating value={rating} onChange={setRating} disabled={submitting} />
      <textarea
        className={styles.actionTextarea}
        placeholder="Add a comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.currentTarget.value)}
        disabled={submitting}
        rows={2}
        aria-label="Comment"
      />
      {error ? <FormBanner variant="error" message={error} onRetry={() => void submit()} /> : null}
      <div className={styles.reorderRow}>
        <Button onClick={() => void submit()} disabled={submitting || rating < 1}>
          {submitting ? 'Saving…' : 'Submit'}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setEditing(false)} disabled={submitting}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReorderAction({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const reorder = item.reorder;
  if (!reorder) return null;

  const trigger = async () => {
    setState('loading');
    setError(null);
    try {
      await ordersApi.reorder(orderId, item.id);
      setState('done');
    } catch (err) {
      setState('error');
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not add this to your cart. Please try again.',
      );
    }
  };

  if (!reorder.eligible) {
    return (
      <p className={styles.reorderUnavailable} role="status">
        {reorder.reason}
      </p>
    );
  }

  if (state === 'done') {
    return (
      <p className={styles.reviewDone} role="status">
        Added to your cart. <a href="/cart">View cart</a>
      </p>
    );
  }

  return (
    <div className={styles.reorderRow}>
      {reorder.currentPrice !== null ? (
        <span className={styles.itemMeta}>Current price: {formatPrice(reorder.currentPrice)}</span>
      ) : null}
      <Button onClick={() => void trigger()} disabled={state === 'loading'}>
        {state === 'loading' ? 'Adding…' : item.type === 'PRODUCT_WITH_FITTING' ? 'Buy + Fit Again' : 'Buy Again'}
      </Button>
      {error ? <FormBanner variant="error" message={error} onRetry={() => void trigger()} /> : null}
    </div>
  );
}

function RepeatServiceAction({ orderId, item }: { orderId: string; item: OrderItemDto }) {
  const [prefillGarmentType, setPrefillGarmentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ordersApi.reorder(orderId, item.id);
      if (result.kind === 'PREFILL') setPrefillGarmentType(result.prefill.garmentType);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : 'Could not prepare this repeat action. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (prefillGarmentType !== null) {
    const href = item.type === 'EXISTING_GARMENT_FITTING' ? '/existing-garment' : '/custom-stitching';
    return (
      <div className={styles.reorderRow}>
        <span className={styles.itemMeta}>Based on: {prefillGarmentType || 'your previous request'}</span>
        <Button href={href}>Start a new request</Button>
      </div>
    );
  }

  return (
    <div className={styles.reorderRow}>
      <Button onClick={() => void trigger()} disabled={loading}>
        {loading ? 'Preparing…' : 'Repeat this service'}
      </Button>
      {error ? <FormBanner variant="error" message={error} onRetry={() => void trigger()} /> : null}
    </div>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [order, setOrder] = useState<OrderDetailDto | null>(null);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await ordersApi.get(orderId);
      setOrder(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load this order. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState.kind === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.centerState} role="status" aria-live="polite">
          Loading order…
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error' || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <FormBanner
            variant="error"
            message={loadState.kind === 'error' ? loadState.message : 'Order not found.'}
            onRetry={() => void load()}
          />
        </div>
      </div>
    );
  }

  const isSideState = SIDE_STATES.includes(order.status);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Order #{order.id.slice(0, 8)}</h1>
            <span className={styles.placedOn}>
              Placed {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.headerActions}>
            <a href={`/support?category=ORDER&orderId=${order.id}`} className={styles.refreshButton}>
              Contact Support
            </a>
            <button type="button" className={styles.refreshButton} onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>

        <p className={styles.statusMessage} role="status">
          {order.statusMessage}
        </p>

        {isSideState ? (
          <FormBanner
            variant="error"
            message={order.status === 'CANCELLED' ? 'This order was cancelled.' : order.statusMessage}
          />
        ) : null}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Status</h2>
          <ol className={styles.timeline}>
            {order.timelineSteps.map((step, index) => (
              <li
                key={step}
                className={`${styles.timelineStep} ${index <= order.currentStepIndex ? styles.timelineStepDone : ''}`}
                aria-current={index === order.currentStepIndex ? 'step' : undefined}
              >
                {ORDER_STATUS_LABEL[step]}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <div className={styles.list}>
            {order.items.map((item) => (
              <div className={styles.item} key={item.id}>
                <div>
                  <p className={styles.itemType}>{ITEM_TYPE_LABELS[item.type]}</p>
                  <p className={styles.itemName}>{itemName(item)}</p>
                  {item.variant ? (
                    <p className={styles.itemMeta}>
                      {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                      {item.quantity ? ` · Qty ${item.quantity}` : ''}
                    </p>
                  ) : null}
                  {item.fitProfile ? (
                    <p className={styles.itemMeta}>Fit Profile: {item.fitProfile.label}</p>
                  ) : null}
                  {item.fittingServices.length > 0 ? (
                    <p className={styles.itemMeta}>
                      Services: {item.fittingServices.map((s) => s.name).join(', ')}
                    </p>
                  ) : null}
                  {item.existingGarment ? (
                    <p className={styles.itemMeta}>
                      Condition: {item.existingGarment.condition} ·{' '}
                      {item.existingGarment.photoCount} photo
                      {item.existingGarment.photoCount === 1 ? '' : 's'}
                    </p>
                  ) : null}
                  {item.customStitching?.fabricDetails ? (
                    <p className={styles.itemMeta}>Fabric: {item.customStitching.fabricDetails}</p>
                  ) : null}
                  {item.fitting ? <p className={styles.fittingMessage}>{item.fitting.message}</p> : null}
                  {item.fitting?.actionRequired ? (
                    <ActionRequiredForm
                      orderId={order.id}
                      actionRequestId={item.fitting.actionRequired.id}
                      requestedInfo={item.fitting.actionRequired.requestedInfo}
                      onResolved={() => void load()}
                    />
                  ) : null}

                  {order.status === 'COMPLETED' ? (
                    <div className={styles.postOrderActions}>
                      {item.reviewableTargets.map((target) => (
                        <ReviewCta
                          key={target.targetType}
                          orderId={order.id}
                          orderItemId={item.id}
                          targetType={target.targetType}
                          existingReview={target.existingReview}
                          onSaved={() => void load()}
                        />
                      ))}
                      {item.reorder ? <ReorderAction orderId={order.id} item={item} /> : null}
                      {item.type === 'EXISTING_GARMENT_FITTING' || item.type === 'CUSTOM_STITCHING' ? (
                        <RepeatServiceAction orderId={order.id} item={item} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <span className={styles.itemPrice}>
                  {item.lineTotal !== null ? formatPrice(item.lineTotal) : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {order.cancellation ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Cancellation</h2>
            <p className={styles.itemMeta}>
              Reason: {CANCELLATION_REASON_LABELS[order.cancellation.reason]} · Cancelled{' '}
              {new Date(order.cancellation.createdAt).toLocaleDateString()}
            </p>
            {order.cancellation.note ? <p className={styles.itemMeta}>&ldquo;{order.cancellation.note}&rdquo;</p> : null}
          </section>
        ) : order.status !== 'COMPLETED' ? (
          <CancelOrderSection order={order} onCancelled={() => void load()} />
        ) : null}

        {order.refunds.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Refund</h2>
            {order.refunds.map((r) => (
              <div key={r.id} className={styles.reorderRow}>
                <span className={styles.itemMeta}>{REFUND_STATUS_TEXT[r.status] ?? r.status}</span>
                <span className={styles.itemPrice}>{formatPrice(r.amount)}</span>
              </div>
            ))}
            {order.refunds.some((r) => r.status === 'PENDING' || r.status === 'PROCESSING') ? (
              <p className={styles.pendingNote}>Payment processing is not yet connected — refunds remain pending until it is.</p>
            ) : null}
          </section>
        ) : null}

        {order.status !== 'PLACED' && order.status !== 'CANCELLED' ? (
          <DisputeSection order={order} onCreated={() => void load()} />
        ) : null}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Delivery address</h2>
          <p className={styles.address}>
            {order.address.label ? <strong>{order.address.label}</strong> : null}
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ''}, {order.address.city},{' '}
            {order.address.state} {order.address.postalCode}, {order.address.country}
          </p>
        </section>

        <section className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Product subtotal</span>
            <span>{formatPrice(order.productSubtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Fitting subtotal</span>
            <span>{order.fittingSubtotal > 0 ? formatPrice(order.fittingSubtotal) : '—'}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.hasUnpricedItems ? (
            <p className={styles.pendingNote}>
              Some items are still pending pricing confirmation (fitting fees, custom stitching
              quotes, or garment inspection).
            </p>
          ) : null}
          <p className={styles.pendingNote}>
            Payment status: {order.paymentState === 'PENDING' ? 'Pending' : order.paymentState}
          </p>
        </section>
      </div>
    </div>
  );
}
