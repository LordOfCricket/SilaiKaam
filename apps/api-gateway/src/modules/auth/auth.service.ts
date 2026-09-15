import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface IdentityUserResponse extends AuthUser {
  isActive: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    const identityUrl = this.config.get('IDENTITY_SERVICE_URL', { infer: true });
    const userServiceUrl = this.config.get('USER_SERVICE_URL', { infer: true });

    const user = await this.http.request<IdentityUserResponse>({
      method: 'POST',
      url: `${identityUrl}/internal/auth/register`,
      body: { email: dto.email, password: dto.password },
    });

    try {
      await this.http.request({
        method: 'POST',
        url: `${userServiceUrl}/internal/customers`,
        body: { userId: user.id, fullName: dto.fullName },
      });
    } catch (error) {
      this.logger.warn(
        `Customer profile creation failed for user ${user.id}, rolling back identity record: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Compensate: don't leave an identity record with no profile behind it.
      await this.http
        .request({ method: 'DELETE', url: `${identityUrl}/internal/auth/users/${user.id}` })
        .catch((rollbackError) => {
          this.logger.error(
            `Failed to roll back orphaned identity user ${user.id} after profile creation failure`,
            rollbackError instanceof Error ? rollbackError.stack : undefined,
          );
        });
      throw new InternalServerErrorException({
        code: 'REGISTRATION_FAILED',
        message: 'Registration failed. Please try again.',
      });
    }

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(dto: LoginDto): Promise<AuthUser> {
    const identityUrl = this.config.get('IDENTITY_SERVICE_URL', { infer: true });
    const user = await this.http.request<IdentityUserResponse>({
      method: 'POST',
      url: `${identityUrl}/internal/auth/login`,
      body: { email: dto.email, password: dto.password },
    });
    return { id: user.id, email: user.email, role: user.role };
  }
}
