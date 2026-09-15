import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, ExistingGarmentRequestDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CreateExistingGarmentRequestDto } from './dto/create-existing-garment-request.dto';

@Injectable()
export class ExistingGarmentService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  create(user: AuthUser, dto: CreateExistingGarmentRequestDto): Promise<ExistingGarmentRequestDto> {
    return this.http.request<ExistingGarmentRequestDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/fitting/by-user/${user.id}/existing-garment`,
      body: dto,
      headers: { 'x-user-id': user.id, 'x-user-role': user.role },
    });
  }

  private baseUrl(): string {
    return this.config.get('FITTING_SERVICE_URL', { infer: true });
  }
}
