'use client';

import { processSteps } from '../data/processSteps';
import type { ProcessStep } from '../types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './HowItWorksSection.module.css';

function StitchMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.4" />
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Step({ step, index }: { step: ProcessStep; index: number }) {
  const { ref, visible } = useScrollReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      className={`${styles.step} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
    >
      <span className={styles.marker} aria-hidden="true">
        <StitchMark />
      </span>
      <div className={styles.content}>
        <span className={styles.number}>{step.number}</span>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDescription}>{step.description}</p>
      </div>
    </li>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-it-works-heading">
      <div className={styles.header}>
        <p className={styles.eyebrow}>The process</p>
        <h2 id="how-it-works-heading" className={styles.headline}>
          How SilaiKaam works
        </h2>
        <p className={styles.lead}>
          Five steps, stitched together — from the garment you have to the fit you actually want.
        </p>
      </div>

      <ol className={styles.timeline}>
        {processSteps.map((step, index) => (
          <Step key={step.number} step={step} index={index} />
        ))}
      </ol>
    </section>
  );
}
