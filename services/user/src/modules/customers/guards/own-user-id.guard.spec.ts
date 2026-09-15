import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnUserIdGuard } from './own-user-id.guard';

function buildContext(headerUserId: string | undefined, routeUserId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'x-user-id': headerUserId },
        params: { userId: routeUserId },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('OwnUserIdGuard', () => {
  const guard = new OwnUserIdGuard();

  it('allows a request when the header matches the route param', () => {
    expect(guard.canActivate(buildContext('user-1', 'user-1'))).toBe(true);
  });

  it('rejects cross-customer access when the header does not match the route param', () => {
    expect(() => guard.canActivate(buildContext('user-1', 'user-2'))).toThrow(ForbiddenException);
  });

  it('rejects requests with no asserted identity', () => {
    expect(() => guard.canActivate(buildContext(undefined, 'user-2'))).toThrow(ForbiddenException);
  });
});
