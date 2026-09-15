import { apiClient } from '@/lib/api-client';
import type { SupportCategory, SupportTicketDetailDto, SupportTicketSummaryDto } from '@silaikaam/types';

export interface CreateTicketPayload {
  category: SupportCategory;
  orderId?: string;
  subject: string;
  description: string;
}

export const supportApi = {
  list: () => apiClient.get<SupportTicketSummaryDto[]>('/support/tickets'),
  create: (payload: CreateTicketPayload) => apiClient.post<SupportTicketDetailDto>('/support/tickets', payload),
  get: (ticketId: string) => apiClient.get<SupportTicketDetailDto>(`/support/tickets/${ticketId}`),
  addMessage: (ticketId: string, message: string) =>
    apiClient.post<SupportTicketDetailDto>(`/support/tickets/${ticketId}/messages`, { message }),
  close: (ticketId: string) => apiClient.post<SupportTicketDetailDto>(`/support/tickets/${ticketId}/close`),
};
