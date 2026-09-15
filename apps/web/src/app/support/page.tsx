import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SupportListView } from '@/features/support/components/SupportListView';

export const metadata: Metadata = { title: 'Support', robots: { index: false, follow: false } };

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportListView />
    </Suspense>
  );
}
