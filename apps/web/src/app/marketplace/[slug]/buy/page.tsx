import type { Metadata } from 'next';
import { BuyProductView } from '@/features/marketplace/components/BuyProductView';

export const metadata: Metadata = { title: 'Buy Product' };

interface BuyPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ size?: string; color?: string; qty?: string }>;
}

export default async function BuyPage({ params, searchParams }: BuyPageProps) {
  const { slug } = await params;
  const { size, color, qty } = await searchParams;
  return <BuyProductView slug={slug} size={size} color={color} qty={qty} />;
}
