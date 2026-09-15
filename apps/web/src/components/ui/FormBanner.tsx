import styles from './FormBanner.module.css';

interface FormBannerProps {
  variant: 'error' | 'success';
  message: string;
  onRetry?: () => void;
}

export function FormBanner({ variant, message, onRetry }: FormBannerProps) {
  return (
    <div
      className={`${styles.banner} ${styles[variant]}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
