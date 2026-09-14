import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import {
  createWoodTexture,
  createBrandedCapTexture,
  createThreadTexture,
} from './proceduralTextures';

const CORE_RADIUS = 0.62;
const CORE_LENGTH = 1.55;
const CAP_RADIUS = 1.05;
const CAP_THICKNESS = 0.12;
const CAP_OFFSET = CORE_LENGTH / 2 + CAP_THICKNESS / 2;

export function ThreadSpool() {
  const woodTexture = useMemo(() => createWoodTexture(), []);
  const brandedTexture = useMemo(() => createBrandedCapTexture(), []);
  const threadTexture = useMemo(() => createThreadTexture(), []);

  const woodMaterial = useMemo(
    () => new MeshStandardMaterial({ map: woodTexture, roughness: 0.55, metalness: 0.02 }),
    [woodTexture],
  );

  const frontCapMaterials = useMemo(
    () => [
      woodMaterial,
      new MeshStandardMaterial({ map: brandedTexture, roughness: 0.5, metalness: 0.02 }),
      woodMaterial,
    ],
    [woodMaterial, brandedTexture],
  );

  return (
    <group rotation={[0.08, 0.55, 1.32]}>
      <mesh>
        <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, CORE_LENGTH, 48, 1, true]} />
        <meshStandardMaterial map={threadTexture} roughness={0.7} metalness={0.05} />
      </mesh>

      <mesh position={[0, -CAP_OFFSET, 0]} material={woodMaterial}>
        <cylinderGeometry args={[CAP_RADIUS, CAP_RADIUS, CAP_THICKNESS, 48]} />
      </mesh>

      <mesh position={[0, CAP_OFFSET, 0]} material={frontCapMaterials}>
        <cylinderGeometry args={[CAP_RADIUS, CAP_RADIUS, CAP_THICKNESS, 48]} />
      </mesh>
    </group>
  );
}
