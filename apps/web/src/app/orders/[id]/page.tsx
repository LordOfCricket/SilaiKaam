import type { Metadata } from 'next';
import { OrderDetailView } from '@/features/orders/components/OrderDetailView';

export const metadata: Metadata = { title: 'Order Details', robots: { index: false, follow: false } };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}
