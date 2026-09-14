import { Button } from '@/components/ui/Button';
import { HeroSceneLoader } from '@/components/three/HeroSceneLoader';
import { HeroProgressRail } from './HeroProgressRail';
import styles from './Hero.module.css';

const processSteps = ['Measure', 'Design', 'Fit', 'Wear Better'];

export function Hero() {
  return (
    <section id="top" className={styles.hero} aria-label="Introduction">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Made-to-measure, made simple</p>

        <h1 className={styles.headline}>
          Perfect Fit.
          <br />
          <em>Made Personal.</em>
        </h1>

        <p className={styles.lead}>
          SilaiKaam blends Indian tailoring craftsmanship with modern fit technology — so every
          garment is measured, fitted, and finished around you.
        </p>

        <div className={styles.actions}>
          <Button href="#get-fit" variant="primary" showArrow>
            Get My Fit
          </Button>
          <Button href="#how-it-works" variant="secondary">
            Explore How It Works
          </Button>
        </div>

        <p className={styles.process} aria-label="Our process">
          {processSteps.map((step, index) => (
            <span key={step}>
              {step}
              {index < processSteps.length - 1 ? <span> — </span> : null}
            </span>
          ))}
        </p>
      </div>

      <div className={styles.sceneWrap}>
        <HeroSceneLoader />
      </div>

      <HeroProgressRail />
    </section>
  );
}
