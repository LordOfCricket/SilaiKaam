'use client';

import type { TrustPillar } from '../types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import styles from './QualityProcessVisual.module.css';

function ProcessNode({ pillar, index }: { pillar: TrustPillar; index: number }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      role="listitem"
      className={`${styles.node} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: visible ? `${index * 100}ms` : '0ms' }}
    >
      <span className={styles.marker} aria-hidden="true">
        {pillar.number}
      </span>
      <div className={styles.content}>
        <h3 className={styles.nodeTitle}>{pillar.title}</h3>
        <p className={styles.nodeDescription}>{pillar.description}</p>
      </div>
    </div>
  );
}

interface QualityProcessVisualProps {
  pillars: TrustPillar[];
}

export function QualityProcessVisual({ pillars }: QualityProcessVisualProps) {
  return (
    <div className={styles.sequence} role="list" aria-label="The SilaiKaam quality process">
      {pillars.map((pillar, index) => (
        <ProcessNode key={pillar.number} pillar={pillar} index={index} />
      ))}
    </div>
  );
}
