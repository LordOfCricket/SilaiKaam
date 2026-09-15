import Link from 'next/link';
import type { ProductSummaryDto } from '@silaikaam/types';
import { SaveButton } from '@/features/wishlist/components/SaveButton';
import styles from './ProductCard.module.css';

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductCard({
  product,
  initialSaved = false,
}: {
  product: ProductSummaryDto;
  initialSaved?: boolean;
}) {
  const hasDiscount = product.discountPrice !== null && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className={styles.card}
      aria-label={`View ${product.name}`}
    >
      <div className={styles.visual}>
        <div className={styles.saveButtonSlot}>
          <SaveButton productId={product.id} initialSaved={initialSaved} />
        </div>
        {product.availability !== 'IN_STOCK' ? (
          <span className={`${styles.badge} ${styles.badgeOut}`}>
            {product.availability === 'OUT_OF_STOCK' ? 'Out of stock' : 'Preorder'}
          </span>
        ) : null}
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension catalog images
          <img src={product.imageUrl} alt="" />
        ) : (
          <span aria-hidden="true">No image yet</span>
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.category}>{product.category.name}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.priceRow}>
          {hasDiscount ? (
            <>
              <span className={styles.price}>
                {formatPrice(product.discountPrice!, product.currency)}
              </span>
              <span className={styles.originalPrice}>
                {formatPrice(product.price, product.currency)}
              </span>
              <span className={styles.discountPercent}>{discountPercent}% off</span>
            </>
          ) : (
            <span className={styles.price}>{formatPrice(product.price, product.currency)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
