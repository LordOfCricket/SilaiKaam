import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import type { Group } from 'three';
import { ThreadSpool } from './ThreadSpool';
import { ThreadPath } from './ThreadPath';

interface SceneContentProps {
  animate: boolean;
  progressRef: React.MutableRefObject<number>;
}

export function SceneContent({ animate, progressRef }: SceneContentProps) {
  const rigRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!rigRef.current) return;

    const scrollTilt = progressRef.current * 0.22;
    const parallaxX = animate ? state.pointer.y * 0.1 : 0;
    const parallaxY = animate ? state.pointer.x * 0.14 : 0;
    const lerp = Math.min(delta * 2.2, 1);

    rigRef.current.rotation.x += (parallaxX - rigRef.current.rotation.x) * lerp;
    rigRef.current.rotation.y += (scrollTilt + parallaxY - rigRef.current.rotation.y) * lerp;
  });

  return (
    <>
      <ambientLight intensity={0.42} color="#fff3e2" />
      <directionalLight position={[3.4, 4.2, 4.6]} intensity={1.7} color="#fff7ec" />
      <directionalLight position={[-2.8, 1.4, -2.6]} intensity={0.32} color="#cdd9e6" />
      <pointLight position={[-2.2, -1, 2.6]} intensity={0.5} color="#c9803f" />

      <group ref={rigRef} position={[0.3, 0.3, 0]}>
        <ThreadSpool />
        <ThreadPath progressRef={progressRef} />
      </group>

      <ContactShadows
        position={[0, -1.7, 0]}
        opacity={0.34}
        scale={7}
        blur={2.6}
        far={3}
        color="#201c18"
        frames={animate ? Infinity : 1}
      />
    </>
  );
}
