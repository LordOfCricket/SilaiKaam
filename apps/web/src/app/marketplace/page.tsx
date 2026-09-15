import type { Metadata } from 'next';
import { MarketplaceView } from '@/features/marketplace/components/MarketplaceView';

export const metadata: Metadata = { title: 'Marketplace' };

export default function MarketplacePage() {
  return <MarketplaceView />;
}
