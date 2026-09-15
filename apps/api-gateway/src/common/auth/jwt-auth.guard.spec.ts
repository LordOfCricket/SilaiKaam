import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokenService } from './token.service';

function buildContext(cookies: Record<string, string>) {
  const request: { cookies: Record<string, string>; user?: unknown } = { cookies };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('rejects a request with no session cookie', async () => {
    const tokenService = { verify: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokenService);
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a request with an invalid/expired session token', async () => {
    const tokenService = {
      verify: jest.fn().mockRejectedValue(new UnauthorizedException()),
    } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokenService);
    const { context } = buildContext({ [AUTH_COOKIE_NAME]: 'bad-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the verified user to the request for a valid session', async () => {
    const user = { id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER' as const };
    const tokenService = { verify: jest.fn().mockResolvedValue(user) } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokenService);
    const { context, request } = buildContext({ [AUTH_COOKIE_NAME]: 'good-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });
});
