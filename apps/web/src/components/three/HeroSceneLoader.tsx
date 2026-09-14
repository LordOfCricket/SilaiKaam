'use client';

import dynamic from 'next/dynamic';
import { SceneFallback } from './SceneFallback';

const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => <SceneFallback />,
});

export function HeroSceneLoader() {
  return <HeroScene />;
}
