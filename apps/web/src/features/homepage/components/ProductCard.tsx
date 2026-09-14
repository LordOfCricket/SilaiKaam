'use client';

import type { Product } from '../types';
import { GarmentGlyph } from './GarmentGlyph';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <article
      ref={ref}
      className={`${styles.card} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${(index % 3) * 90}ms` : '0ms' }}
      aria-labelledby={`${product.id}-name`}
    >
      <div className={styles.visual} data-category={product.category}>
        {product.badge && <span className={styles.badge}>{product.badge}</span>}
        <div className={styles.glyph}>
          <GarmentGlyph variant={product.category} />
        </div>
      </div>

      <div className={styles.info}>
        <p className={styles.category}>{product.categoryLabel}</p>
        <h3 id={`${product.id}-name`} className={styles.name}>
          {product.name}
        </h3>
        <p className={styles.price}>₹{product.price.toLocaleString('en-IN')}</p>
        <p className={styles.sizes}>{product.sizes.join(' · ')}</p>

        <div className={styles.fitScore}>
          <div className={styles.fitScoreHeader}>
            <span>SilaiKaam Fit Score</span>
            <span className={styles.fitScoreValue}>{product.fitScore}</span>
          </div>
          <div
            className={styles.fitScoreTrack}
            role="img"
            aria-label={`SilaiKaam Fit Score ${product.fitScore} out of 100 — ${product.fitScoreLabel}`}
          >
            <div className={styles.fitScoreFill} style={{ width: `${product.fitScore}%` }} />
          </div>
          <p className={styles.fitScoreLabel}>{product.fitScoreLabel}</p>
        </div>
      </div>
    </article>
  );
}
