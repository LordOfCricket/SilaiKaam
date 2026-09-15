import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, CustomStitchingRequestDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CreateCustomStitchingRequestDto } from './dto/create-custom-stitching-request.dto';

@Injectable()
export class CustomStitchingService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  create(user: AuthUser, dto: CreateCustomStitchingRequestDto): Promise<CustomStitchingRequestDto> {
    return this.http.request<CustomStitchingRequestDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/fitting/by-user/${user.id}/custom-stitching`,
      body: dto,
      headers: { 'x-user-id': user.id, 'x-user-role': user.role },
    });
  }

  private baseUrl(): string {
    return this.config.get('FITTING_SERVICE_URL', { infer: true });
  }
}
