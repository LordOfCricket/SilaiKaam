import type { ReactElement } from 'react';
import type { FitProblemVariant } from '../types';

interface ProblemSketchProps {
  variant: FitProblemVariant;
}

const THREAD = 'var(--color-thread)';
const INK = 'var(--color-ink)';

function SleeveSketch(): ReactElement {
  return (
    <>
      <rect x="30" y="20" width="60" height="90" rx="14" stroke={INK} strokeWidth="2" fill="none" />
      <polyline points="52,20 60,32 68,20" stroke={INK} strokeWidth="2" fill="none" />
      <line x1="90" y1="34" x2="98" y2="72" stroke={INK} strokeWidth="2" />
      <line x1="93" y1="68" x2="103" y2="76" stroke={THREAD} strokeWidth="2.5" />
      <line
        x1="98"
        y1="72"
        x2="112"
        y2="92"
        stroke={THREAD}
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <line x1="108" y1="88" x2="116" y2="96" stroke={THREAD} strokeWidth="2" />
    </>
  );
}

function WaistSketch(): ReactElement {
  return (
    <>
      <rect x="30" y="20" width="60" height="90" rx="14" stroke={INK} strokeWidth="2" fill="none" />
      <line x1="30" y1="75" x2="90" y2="75" stroke={INK} strokeWidth="2" />
      <line x1="22" y1="86" x2="98" y2="86" stroke={THREAD} strokeWidth="2" strokeDasharray="4 4" />
      <line x1="22" y1="82" x2="22" y2="90" stroke={THREAD} strokeWidth="2" />
      <line x1="98" y1="82" x2="98" y2="90" stroke={THREAD} strokeWidth="2" />
    </>
  );
}

function ShoulderSketch(): ReactElement {
  return (
    <>
      <rect x="30" y="28" width="60" height="82" rx="14" stroke={INK} strokeWidth="2" fill="none" />
      <polyline points="30,28 58,20 90,28" stroke={INK} strokeWidth="2" fill="none" />
      <circle cx="58" cy="20" r="2.4" fill={INK} />
      <polyline
        points="24,34 58,26 96,34"
        stroke={THREAD}
        strokeWidth="2"
        strokeDasharray="4 4"
        fill="none"
      />
      <circle cx="58" cy="26" r="2.4" fill={THREAD} />
    </>
  );
}

function TrouserSketch(): ReactElement {
  return (
    <>
      <rect x="32" y="30" width="22" height="100" rx="8" stroke={INK} strokeWidth="2" fill="none" />
      <rect x="66" y="30" width="22" height="100" rx="8" stroke={INK} strokeWidth="2" fill="none" />
      <line x1="30" y1="120" x2="90" y2="120" stroke={INK} strokeWidth="2" />
      <path
        d="M32 130 Q38 136 44 130 T56 130 T68 130 T80 130 T90 130"
        stroke={THREAD}
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 4"
      />
    </>
  );
}

const SKETCHES: Record<FitProblemVariant, () => ReactElement> = {
  sleeve: SleeveSketch,
  waist: WaistSketch,
  shoulder: ShoulderSketch,
  trouser: TrouserSketch,
};

export function ProblemSketch({ variant }: ProblemSketchProps) {
  const Sketch = SKETCHES[variant];
  return (
    <svg viewBox="0 0 120 160" width="100%" height="100%" aria-hidden="true" strokeLinecap="round">
      <Sketch />
    </svg>
  );
}
