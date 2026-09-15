import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, FitProfileDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { UpsertFitProfileDto } from './dto/upsert-fit-profile.dto';

@Injectable()
export class FitProfileService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  getOwn(user: AuthUser): Promise<FitProfileDto | null> {
    return this.http.request<FitProfileDto | null>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/fit-profile`,
      headers: this.identityHeaders(user),
    });
  }

  upsertOwn(user: AuthUser, dto: UpsertFitProfileDto): Promise<FitProfileDto> {
    return this.http.request<FitProfileDto>({
      method: 'PUT',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/fit-profile`,
      body: dto,
      headers: this.identityHeaders(user),
    });
  }

  private baseUrl(): string {
    return this.config.get('USER_SERVICE_URL', { infer: true });
  }

  private identityHeaders(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }
}
