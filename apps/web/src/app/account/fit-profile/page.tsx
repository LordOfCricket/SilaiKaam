import type { Metadata } from 'next';
import { FitProfileView } from '@/features/fit-profile/components/FitProfileView';

export const metadata: Metadata = { title: 'My Fit Profile' };

export default function FitProfilePage() {
  return <FitProfileView />;
}
