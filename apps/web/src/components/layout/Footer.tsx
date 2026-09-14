import { footerColumns } from '@/features/homepage/data/footerLinks';
import { GarmentGlyph } from '@/features/homepage/components/GarmentGlyph';
import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <span className={styles.decor} aria-hidden="true">
        <GarmentGlyph variant="kurta" />
      </span>

      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <p className={styles.wordmark}>SilaiKaam</p>
            <p className={styles.statement}>Clothing that fits your body, your way.</p>
          </div>

          <div className={styles.columns}>
            {footerColumns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className={styles.columnLabel}>{column.title}</p>
                <ul className={styles.linkList}>
                  {column.links.map((link) =>
                    link.href ? (
                      <li key={link.label}>
                        <a href={link.href} className={styles.link}>
                          {link.label}
                        </a>
                      </li>
                    ) : (
                      <li key={link.label}>
                        <span className={styles.placeholder}>
                          {link.label}
                          <span className={styles.soonTag}>Soon</span>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.bottom}>
          <p>© {year} SilaiKaam</p>
          <div className={styles.legal}>
            <span className={styles.placeholder}>
              Privacy <span className={styles.soonTag}>Soon</span>
            </span>
            <span className={styles.placeholder}>
              Terms <span className={styles.soonTag}>Soon</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
