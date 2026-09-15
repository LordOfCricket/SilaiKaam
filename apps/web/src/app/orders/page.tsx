import type { Metadata } from 'next';
import { OrdersListView } from '@/features/orders/components/OrdersListView';

export const metadata: Metadata = { title: 'My Orders', robots: { index: false, follow: false } };

export default function OrdersPage() {
  return <OrdersListView />;
}
