'use client';

import type { Review } from '../types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  review: Review;
  index: number;
}

export function ReviewCard({ review, index }: ReviewCardProps) {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <article
      ref={ref}
      className={`${styles.card} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
      aria-labelledby={`${review.id}-quote`}
    >
      <p className={styles.figure} aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </p>

      <div>
        <p id={`${review.id}-quote`} className={styles.quote}>
          &ldquo;{review.quote}&rdquo;
        </p>

        <div className={styles.meta}>
          <span className={styles.garmentTag}>{review.garmentType}</span>
          <span className={styles.rating} role="img" aria-label={`Rated ${review.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i < review.rating ? styles.filled : ''}`}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className={styles.person}>
            {review.name}
            {review.location ? ` · ${review.location}` : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
