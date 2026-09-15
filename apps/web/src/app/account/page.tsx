import type { Metadata } from 'next';
import { AccountView } from '@/features/account/components/AccountView';

export const metadata: Metadata = { title: 'My Account', robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountView />;
}
