import styles from './SceneFallback.module.css';

interface SceneFallbackProps {
  label?: string;
}

export function SceneFallback({
  label = 'SilaiKaam — draped fabric and thread',
}: SceneFallbackProps) {
  return <div className={styles.fallback} role="img" aria-label={label} />;
}
