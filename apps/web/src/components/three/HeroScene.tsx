'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneContent } from './SceneContent';
import { SceneFallback } from './SceneFallback';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import { hasWebGL } from './webgl';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export default function HeroScene() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const progressRef = useRef(0);

  useEffect(() => {
    setWebglSupported(hasWebGL());
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleScroll = () => {
      progressRef.current = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.9), 0), 1);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  if (webglSupported === false) {
    return <SceneFallback />;
  }

  if (webglSupported === null) {
    return <SceneFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<SceneFallback />}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6.2], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={prefersReducedMotion ? 'demand' : 'always'}
      >
        <SceneContent animate={!prefersReducedMotion} progressRef={progressRef} />
      </Canvas>
    </WebGLErrorBoundary>
  );
}
