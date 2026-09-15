import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, NotificationDto, NotificationListResultDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  list(user: AuthUser, unreadOnly?: boolean, limit?: number): Promise<NotificationListResultDto> {
    const query = new URLSearchParams();
    if (unreadOnly) query.set('unreadOnly', 'true');
    if (limit) query.set('limit', String(limit));
    const qs = query.toString();
    return this.http.request<NotificationListResultDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/notifications${qs ? `?${qs}` : ''}`,
      headers: this.headers(user),
    });
  }

  markRead(user: AuthUser, notificationId: string): Promise<NotificationDto> {
    return this.http.request<NotificationDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/notifications/${notificationId}/read`,
      headers: this.headers(user),
    });
  }

  markAllRead(user: AuthUser): Promise<{ updated: number }> {
    return this.http.request<{ updated: number }>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/notifications/read-all`,
      headers: this.headers(user),
    });
  }

  private baseUrl(): string {
    return this.config.get('USER_SERVICE_URL', { infer: true });
  }

  private headers(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }
}
