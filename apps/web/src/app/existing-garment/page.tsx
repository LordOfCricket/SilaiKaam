import type { Metadata } from 'next';
import { ExistingGarmentForm } from '@/features/existing-garment/components/ExistingGarmentForm';

export const metadata: Metadata = { title: 'Existing Garment Fitting' };

export default function ExistingGarmentPage() {
  return <ExistingGarmentForm />;
}
