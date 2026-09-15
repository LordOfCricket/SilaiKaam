import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@silaikaam/types';
import { RolesGuard } from './roles.guard';

function buildContext(user: AuthUser | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when the user has one of the required roles', () => {
    const reflector = { getAllAndOverride: () => ['CUSTOMER'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthUser = { id: 'u1', email: 'a@example.com', role: 'CUSTOMER' };

    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('rejects a customer trying to reach a staff-only route', () => {
    const reflector = { getAllAndOverride: () => ['STAFF', 'SUPER_ADMIN'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthUser = { id: 'u1', email: 'a@example.com', role: 'CUSTOMER' };

    expect(() => guard.canActivate(buildContext(user))).toThrow(ForbiddenException);
  });

  it('allows any authenticated user through when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthUser = { id: 'u1', email: 'a@example.com', role: 'TAILOR' };

    expect(guard.canActivate(buildContext(user))).toBe(true);
  });
});
