import { categories } from '../data/categories';
import { GarmentGlyph } from './GarmentGlyph';
import styles from './CategoryExplorer.module.css';

export function CategoryExplorer() {
  return (
    <div className={styles.explorer} role="list" aria-label="Browse by garment category">
      {categories.map((category) => (
        <a
          key={category.id}
          href="#marketplace"
          className={styles.category}
          role="listitem"
          aria-label={`Browse ${category.label} in the SilaiKaam collection`}
        >
          <span className={styles.glyph} aria-hidden="true">
            <GarmentGlyph variant={category.id} />
          </span>
          <span className={styles.label}>{category.label}</span>
          <p className={styles.description}>{category.description}</p>
        </a>
      ))}
    </div>
  );
}
