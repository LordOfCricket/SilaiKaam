import { fittingJourneys } from '../data/fittingJourneys';
import { fitPreferences } from '../data/fitPreferences';
import { JourneyCard } from './JourneyCard';
import styles from './FittingOptionsSection.module.css';

export function FittingOptionsSection() {
  const [buyAndFit, existingClothes] = fittingJourneys;

  return (
    <section
      id="fitting-options"
      className={styles.section}
      aria-labelledby="fitting-options-heading"
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>Fit Your Way</p>
        <h2 id="fitting-options-heading" className={styles.headline}>
          A new garment or one you already love.
        </h2>
        <p className={styles.lead}>
          SilaiKaam works with both — clothes you discover here, and clothes already in your
          wardrobe.
        </p>
      </header>

      <div className={styles.journeys}>
        {buyAndFit && <JourneyCard journey={buyAndFit} variant="buy" index={0} />}
        {existingClothes && <JourneyCard journey={existingClothes} variant="existing" index={1} />}
      </div>

      <div className={styles.preferences}>
        <p className={styles.preferencesLabel}>Fit preferences we work with</p>
        <ul className={styles.preferenceList} aria-label="Fit preferences SilaiKaam supports">
          {fitPreferences.map((preference) => (
            <li key={preference} className={styles.preferenceItem}>
              {preference}
            </li>
          ))}
        </ul>
        <p className={styles.disclaimer}>
          Final alteration suitability is confirmed after garment inspection.
        </p>
      </div>

      <div className={styles.trustNote}>
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
          <p className={styles.trustTitle}>Your garment. Your measurements. Expert hands.</p>
          <p className={styles.trustCopy}>
            Every path leads through the same process — measure, understand, adjust, fit.
          </p>
        </div>
      </div>
    </section>
  );
}
