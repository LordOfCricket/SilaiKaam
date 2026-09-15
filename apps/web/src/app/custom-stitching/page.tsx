import type { Metadata } from 'next';
import { CustomStitchingForm } from '@/features/custom-stitching/components/CustomStitchingForm';

export const metadata: Metadata = { title: 'Custom Stitching' };

export default function CustomStitchingPage() {
  return <CustomStitchingForm />;
}
