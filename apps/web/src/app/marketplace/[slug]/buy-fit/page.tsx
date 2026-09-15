import type { Metadata } from 'next';
import { BuyFitView } from '@/features/buy-fit/components/BuyFitView';

export const metadata: Metadata = { title: 'Buy + Fit' };

interface BuyFitPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ size?: string; color?: string; qty?: string }>;
}

export default async function BuyFitPage({ params, searchParams }: BuyFitPageProps) {
  const { slug } = await params;
  const { size, color, qty } = await searchParams;
  return <BuyFitView slug={slug} size={size} color={color} qty={qty} />;
}
