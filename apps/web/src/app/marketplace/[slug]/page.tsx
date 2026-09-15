import type { Metadata } from 'next';
import { ProductDetailView } from '@/features/marketplace/components/ProductDetailView';

export const metadata: Metadata = { title: 'Product' };

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ size?: string; color?: string; qty?: string }>;
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const initial = await searchParams;
  return <ProductDetailView slug={slug} initial={initial} />;
}
