import { apiClient } from '@/lib/api-client';
import type { NotificationDto, NotificationListResultDto } from '@silaikaam/types';

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiClient.get<NotificationListResultDto>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => apiClient.post<NotificationDto>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post<{ updated: number }>('/notifications/read-all'),
};
