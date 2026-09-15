import type { AddressDto } from '@silaikaam/types';
import styles from './AddressCard.module.css';

export function AddressCard({
  address,
  onEdit,
  onDelete,
  isDeleting,
}: {
  address: AddressDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.label}>{address.label || 'Address'}</span>
        {address.isDefault ? <span className={styles.badge}>Default</span> : null}
      </div>
      <p className={styles.lines}>
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
        <br />
        {address.city}, {address.state} {address.postalCode}
        <br />
        {address.country}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onEdit}
          disabled={isDeleting}
        >
          Edit
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.destructive}`}
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>
  );
}
