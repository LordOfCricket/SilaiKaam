'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import styles from './HeroProgressRail.module.css';

const STEP_COUNT = 5;

export function HeroProgressRail() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleScroll = () => {
      const progress = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.9), 0), 1);
      setActiveIndex(Math.min(STEP_COUNT - 1, Math.floor(progress * STEP_COUNT)));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  return (
    <div className={styles.rail} aria-hidden="true">
      <div className={styles.steps}>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div key={i} className={`${styles.step} ${i === activeIndex ? styles.active : ''}`}>
            <span className={styles.dot} />
            <span>{String(i + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <span className={styles.caption}>Scroll to explore</span>
      <span className={styles.arrow}>↓</span>
    </div>
  );
}
