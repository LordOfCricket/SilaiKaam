import { trustPillars } from '../data/trustPillars';
import { reviews } from '../data/reviews';
import { QualityProcessVisual } from './QualityProcessVisual';
import { ReviewCard } from './ReviewCard';
import styles from './TrustSection.module.css';

export function TrustSection() {
  const featuredReviews = reviews.slice(0, 2);

  return (
    <section
      id="quality-standard"
      className={styles.section}
      aria-labelledby="quality-standard-heading"
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>The SilaiKaam Standard</p>
        <h2 id="quality-standard-heading" className={styles.headline}>
          Fit is personal. Quality shouldn&rsquo;t be.
        </h2>
        <p className={styles.lead}>
          Every garment — new or already yours — moves through the same disciplined fitting process.
        </p>
      </header>

      <QualityProcessVisual pillars={trustPillars} />

      <div id="stories" className={styles.stories}>
        <div className={styles.storiesHeader}>
          <h3 className={styles.storiesLabel}>What fitting feels like</h3>
          <p className={styles.sampleNote}>
            Sample customer stories — review system coming in the marketplace.
          </p>
        </div>

        <div className={styles.list}>
          {featuredReviews.map((review, index) => (
            <ReviewCard key={review.id} review={review} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
