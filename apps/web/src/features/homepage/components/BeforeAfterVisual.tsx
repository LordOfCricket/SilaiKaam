import styles from './BeforeAfterVisual.module.css';

function BeforeGlyph() {
  return (
    <svg viewBox="0 0 80 100" width="100%" height="100%" aria-hidden="true" strokeLinecap="round">
      <path
        d="M26 18 L54 18 L58 30 L64 82 Q58 90 50 84 Q42 92 34 84 Q26 90 18 82 L22 30 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline points="35,18 40,26 45,18" stroke="currentColor" strokeWidth="2" fill="none" />
      <line
        x1="8"
        y1="70"
        x2="18"
        y2="66"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

function AfterGlyph() {
  return (
    <svg viewBox="0 0 80 100" width="100%" height="100%" aria-hidden="true" strokeLinecap="round">
      <rect
        x="22"
        y="18"
        width="36"
        height="64"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <polyline points="35,18 40,25 45,18" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="22" y1="82" x2="58" y2="82" stroke="currentColor" strokeWidth="2" />
      <line x1="64" y1="76" x2="64" y2="88" stroke="currentColor" strokeWidth="1.5" />
      <line x1="60" y1="82" x2="68" y2="82" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BeforeAfterVisual() {
  return (
    <div
      className={styles.wrap}
      role="img"
      aria-label="Before: loose, uneven fit. After: adjusted, balanced fit."
    >
      <div className={styles.item}>
        <span className={`${styles.icon}`}>
          <BeforeGlyph />
        </span>
        <span className={styles.label}>Before</span>
      </div>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
      <div className={styles.item}>
        <span className={`${styles.icon} ${styles.after}`}>
          <AfterGlyph />
        </span>
        <span className={styles.label}>After</span>
      </div>
    </div>
  );
}
