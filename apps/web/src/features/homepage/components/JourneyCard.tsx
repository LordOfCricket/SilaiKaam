'use client';

import type { FittingJourney } from '../types';
import { Button } from '@/components/ui/Button';
import { GarmentGlyph } from './GarmentGlyph';
import { BeforeAfterVisual } from './BeforeAfterVisual';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './JourneyCard.module.css';

interface JourneyCardProps {
  journey: FittingJourney;
  variant: 'buy' | 'existing';
  index: number;
}

export function JourneyCard({ journey, variant, index }: JourneyCardProps) {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <article
      ref={ref}
      className={`${styles.card} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${index * 120}ms` : '0ms' }}
      aria-labelledby={`${journey.id}-title`}
    >
      <div className={styles.visual}>
        {variant === 'buy' ? (
          <>
            <span className={styles.tag}>Discover on SilaiKaam</span>
            <div className={styles.swatchRow}>
              <span className={styles.swatch}>
                <GarmentGlyph variant="shirt" />
              </span>
              <span className={styles.swatch}>
                <GarmentGlyph variant="dress" />
              </span>
              <span className={styles.swatch}>
                <GarmentGlyph variant="blazer" />
              </span>
            </div>
          </>
        ) : (
          <BeforeAfterVisual />
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.eyebrow}>{journey.eyebrow}</p>
        <h3 id={`${journey.id}-title`} className={styles.title}>
          {journey.title}
        </h3>
        <p className={styles.narrative}>{journey.narrative}</p>

        <div className={styles.flow} aria-label={`${journey.eyebrow} process`}>
          {journey.steps.map((step, i) => (
            <span key={step} className={styles.flowStep}>
              {step}
              {i < journey.steps.length - 1 ? ' →' : ''}
            </span>
          ))}
        </div>

        <Button href={journey.ctaHref} variant={variant === 'buy' ? 'primary' : 'secondary'}>
          {journey.ctaLabel}
        </Button>
      </div>
    </article>
  );
}
