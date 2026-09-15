import type { Metadata } from 'next';
import { SupportTicketDetailView } from '@/features/support/components/SupportTicketDetailView';

export const metadata: Metadata = { title: 'Support Ticket', robots: { index: false, follow: false } };

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportTicketDetailView ticketId={id} />;
}
