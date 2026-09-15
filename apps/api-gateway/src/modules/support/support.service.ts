import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, SupportTicketDetailDto, SupportTicketSummaryDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  list(user: AuthUser): Promise<SupportTicketSummaryDto[]> {
    return this.http.request<SupportTicketSummaryDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/support/tickets`,
      headers: this.headers(user),
    });
  }

  create(user: AuthUser, dto: CreateTicketDto): Promise<SupportTicketDetailDto> {
    return this.http.request<SupportTicketDetailDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/support/tickets`,
      body: dto,
      headers: this.headers(user),
    });
  }

  get(user: AuthUser, ticketId: string): Promise<SupportTicketDetailDto> {
    return this.http.request<SupportTicketDetailDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/support/tickets/${ticketId}`,
      headers: this.headers(user),
    });
  }

  addMessage(user: AuthUser, ticketId: string, dto: CreateMessageDto): Promise<SupportTicketDetailDto> {
    return this.http.request<SupportTicketDetailDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/support/tickets/${ticketId}/messages`,
      body: dto,
      headers: this.headers(user),
    });
  }

  close(user: AuthUser, ticketId: string): Promise<SupportTicketDetailDto> {
    return this.http.request<SupportTicketDetailDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/support/tickets/${ticketId}/close`,
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
