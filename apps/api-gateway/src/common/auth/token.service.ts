import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, Role } from '@silaikaam/types';
import { signSessionToken, verifySessionToken } from '@silaikaam/shared';
import type { GatewayEnv } from '../../config/configuration';

// The API Gateway is the sole JWT issuer and verifier in this architecture:
// it is the only process that talks to browsers, so it owns the session
// cookie end to end. Downstream services never see the JWT — they trust
// the `x-user-id`/`x-user-role` headers the gateway sets after verifying it.
@Injectable()
export class TokenService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>) {}

  async issue(user: AuthUser): Promise<string> {
    return signSessionToken(
      { sub: user.id, email: user.email, role: user.role },
      this.config.get('JWT_SECRET', { infer: true }),
      this.config.get('JWT_EXPIRES_IN', { infer: true }),
    );
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const claims = await verifySessionToken(
        token,
        this.config.get('JWT_SECRET', { infer: true }),
      );
      return { id: claims.sub, email: claims.email, role: claims.role as Role };
    } catch {
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Your session has expired. Please log in again.',
      });
    }
  }
}
