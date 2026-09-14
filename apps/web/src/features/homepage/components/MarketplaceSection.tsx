import { products } from '../data/products';
import { Button } from '@/components/ui/Button';
import { ProductCard } from './ProductCard';
import { CategoryExplorer } from './CategoryExplorer';
import styles from './MarketplaceSection.module.css';

export function MarketplaceSection() {
  return (
    <section id="marketplace" className={styles.section} aria-labelledby="marketplace-heading">
      <header className={styles.header}>
        <p className={styles.eyebrow}>The SilaiKaam Collection</p>
        <h2 id="marketplace-heading" className={styles.headline}>
          Find the piece. Make it yours.
        </h2>
        <p className={styles.lead}>
          Discover clothing on SilaiKaam, choose what you like, and have it fitted to your
          measurements — one platform for discovery and personal fit.
        </p>
      </header>

      <div className={styles.products}>
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>

      <div className={styles.designedToFit}>
        <svg
          className={styles.stitchMark}
          viewBox="0 0 60 20"
          aria-hidden="true"
          fill="none"
          strokeLinecap="round"
        >
          <path
            d="M2 14 Q17 2 30 10 T58 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
        <div>
          <p className={styles.designedToFitTitle}>Designed to fit.</p>
          <p className={styles.designedToFitCopy}>
            Some garments leave room for adjustment. We help you make that room work for you.
          </p>
        </div>
      </div>

      <div className={styles.categoriesHeader}>
        <h3 className={styles.categoriesTitle}>Shop by category</h3>
      </div>
      <CategoryExplorer />

      <div className={styles.ctaRow}>
        <Button href="#marketplace" variant="primary">
          Explore the Collection
        </Button>
        <Button href="#get-fit" variant="secondary">
          Find Your Fit
        </Button>
      </div>
    </section>
  );
}
