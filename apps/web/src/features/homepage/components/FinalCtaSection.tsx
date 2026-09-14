import { Button } from '@/components/ui/Button';
import styles from './FinalCtaSection.module.css';

export function FinalCtaSection() {
  return (
    <section id="get-fit" className={styles.section} aria-labelledby="get-fit-heading">
      <svg
        className={styles.stitch}
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

      <p className={styles.eyebrow}>Your Perfect Fit Starts Here</p>
      <h2 id="get-fit-heading" className={styles.headline}>
        Ready to make it yours?
      </h2>
      <p className={styles.lead}>
        Bring a garment you already own, or discover something new — either way, SilaiKaam measures
        and fits it around you.
      </p>

      <div className={styles.actions}>
        <Button href="#get-fit" variant="primary">
          Get My Fit
        </Button>
        <Button href="#marketplace" variant="secondary">
          Explore Collection
        </Button>
      </div>
    </section>
  );
}
