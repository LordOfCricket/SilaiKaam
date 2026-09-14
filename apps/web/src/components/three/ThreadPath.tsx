import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, TubeGeometry, Vector3, type Mesh } from 'three';

interface ThreadPathProps {
  progressRef: React.MutableRefObject<number>;
}

const CONTROL_POINTS: Array<[number, number, number]> = [
  [0.75, -0.15, 0.55],
  [0.15, -0.75, 0.85],
  [-0.75, -1.25, 0.6],
  [-1.85, -1.55, 0.2],
  [-2.9, -1.8, -0.15],
];

function buildGeometry(fullPoints: Vector3[], progress: number) {
  const clamped = Math.min(Math.max(progress, 0.06), 1);
  const count = Math.max(2, Math.round(fullPoints.length * clamped));
  const partialCurve = new CatmullRomCurve3(fullPoints.slice(0, count));
  return new TubeGeometry(partialCurve, Math.max(8, count), 0.026, 8, false);
}

export function ThreadPath({ progressRef }: ThreadPathProps) {
  const fullPoints = useMemo(() => {
    const curve = new CatmullRomCurve3(CONTROL_POINTS.map(([x, y, z]) => new Vector3(x, y, z)));
    return curve.getPoints(64);
  }, []);

  const meshRef = useRef<Mesh>(null);
  const lastProgress = useRef(-1);
  const initialGeometry = useMemo(
    () => buildGeometry(fullPoints, progressRef.current),
    [fullPoints, progressRef],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const current = progressRef.current;
    if (Math.abs(current - lastProgress.current) < 0.004) return;
    lastProgress.current = current;
    const old = mesh.geometry;
    mesh.geometry = buildGeometry(fullPoints, current);
    old.dispose();
  });

  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
    };
  }, []);

  return (
    <mesh ref={meshRef} geometry={initialGeometry}>
      <meshStandardMaterial color="#a6432c" roughness={0.42} metalness={0.12} />
    </mesh>
  );
}
