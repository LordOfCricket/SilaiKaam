import type { Metadata } from 'next';
import { AccountView } from '@/features/account/components/AccountView';

export const metadata: Metadata = { title: 'My Account' };

export default function AccountPage() {
  return <AccountView />;
}
