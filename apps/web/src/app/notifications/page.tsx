import type { Metadata } from 'next';
import { NotificationsListView } from '@/features/notifications/components/NotificationsListView';

export const metadata: Metadata = { title: 'Notifications', robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return <NotificationsListView />;
}
