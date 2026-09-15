// Customer support domain types (Batch 9). No staff identity is ever
// exposed — messages only ever show "CUSTOMER" or "SilaiKaam Support".

export const SUPPORT_CATEGORIES = ['ORDER', 'FITTING', 'DELIVERY', 'PRODUCT', 'ACCOUNT', 'OTHER'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_SENDER_TYPES = ['CUSTOMER', 'SUPPORT'] as const;
export type SupportSenderType = (typeof SUPPORT_SENDER_TYPES)[number];

export interface SupportMessageDto {
  id: string;
  senderType: SupportSenderType;
  message: string;
  createdAt: string;
}

export interface SupportTicketSummaryDto {
  id: string;
  category: SupportCategory;
  subject: string;
  status: SupportTicketStatus;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetailDto extends SupportTicketSummaryDto {
  description: string;
  closedAt: string | null;
  messages: SupportMessageDto[];
}
