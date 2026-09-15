import type { Metadata } from 'next';
import { OrdersListView } from '@/features/orders/components/OrdersListView';

export const metadata: Metadata = { title: 'My Orders' };

export default function OrdersPage() {
  return <OrdersListView />;
}
