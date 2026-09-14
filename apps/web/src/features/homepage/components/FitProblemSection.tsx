'use client';

import { fitProblems } from '../data/fitProblems';
import type { FitProblem } from '../types';
import { ProblemSketch } from './ProblemSketch';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './FitProblemSection.module.css';

function ProblemMoment({ problem, index }: { problem: FitProblem; index: number }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`${styles.moment} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${index * 90}ms` : '0ms' }}
    >
      <p className={styles.figure}>{problem.figure}</p>
      <div className={styles.sketch}>
        <ProblemSketch variant={problem.id} />
      </div>
      <h3 className={styles.momentTitle}>{problem.title}</h3>
      <p className={styles.momentDescription}>{problem.description}</p>
    </div>
  );
}

export function FitProblemSection() {
  return (
    <section id="fit-problem" className={styles.section} aria-labelledby="fit-problem-heading">
      <div className={styles.header}>
        <p className={styles.eyebrow}>The problem with off-the-rack</p>
        <h2 id="fit-problem-heading" className={styles.headline}>
          A perfect size.
          <br />
          <em>Still the wrong fit.</em>
        </h2>
        <p className={styles.lead}>
          Standard sizing assumes an average body. Yours isn&rsquo;t one — and it shows in the small
          ways a garment never quite settles right.
        </p>
      </div>

      <div className={styles.grid}>
        {fitProblems.map((problem, index) => (
          <ProblemMoment key={problem.id} problem={problem} index={index} />
        ))}
      </div>
    </section>
  );
}
