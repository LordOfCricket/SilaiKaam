import type { ReactElement } from 'react';
import type { ProductCategoryId } from '../types';

interface GarmentGlyphProps {
  variant: ProductCategoryId;
}

function ShirtGlyph(): ReactElement {
  return (
    <>
      <rect
        x="26"
        y="24"
        width="48"
        height="58"
        rx="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <polyline points="42,24 50,34 58,24" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="26" y1="30" x2="12" y2="44" stroke="currentColor" strokeWidth="2" />
      <line x1="74" y1="30" x2="88" y2="44" stroke="currentColor" strokeWidth="2" />
    </>
  );
}

function TrouserGlyph(): ReactElement {
  return (
    <>
      <rect
        x="30"
        y="18"
        width="17"
        height="66"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="53"
        y="18"
        width="17"
        height="66"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="28" y1="26" x2="72" y2="26" stroke="currentColor" strokeWidth="2" />
    </>
  );
}

function KurtaGlyph(): ReactElement {
  return (
    <>
      <rect
        x="27"
        y="20"
        width="46"
        height="70"
        rx="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <polyline points="43,20 50,30 57,20" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="30" y1="76" x2="24" y2="90" stroke="currentColor" strokeWidth="2" />
      <line x1="70" y1="76" x2="76" y2="90" stroke="currentColor" strokeWidth="2" />
    </>
  );
}

function DressGlyph(): ReactElement {
  return (
    <>
      <polyline
        points="40,20 60,20 66,36 78,86 22,86 34,36"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline points="43,20 50,29 57,20" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  );
}

function BlazerGlyph(): ReactElement {
  return (
    <>
      <rect
        x="26"
        y="26"
        width="48"
        height="56"
        rx="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <polyline points="44,26 50,46 40,58" stroke="currentColor" strokeWidth="2" fill="none" />
      <polyline points="56,26 50,46 60,58" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="26" y1="32" x2="14" y2="42" stroke="currentColor" strokeWidth="2" />
      <line x1="74" y1="32" x2="86" y2="42" stroke="currentColor" strokeWidth="2" />
    </>
  );
}

function TraditionalGlyph(): ReactElement {
  return (
    <>
      <rect
        x="28"
        y="18"
        width="44"
        height="68"
        rx="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M30 22 Q50 50 34 86"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 4"
      />
    </>
  );
}

const GLYPHS: Record<ProductCategoryId, () => ReactElement> = {
  shirt: ShirtGlyph,
  trouser: TrouserGlyph,
  kurta: KurtaGlyph,
  dress: DressGlyph,
  blazer: BlazerGlyph,
  traditional: TraditionalGlyph,
};

export function GarmentGlyph({ variant }: GarmentGlyphProps) {
  const Glyph = GLYPHS[variant];
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" strokeLinecap="round">
      <Glyph />
    </svg>
  );
}
