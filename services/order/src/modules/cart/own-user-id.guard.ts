import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Only the API Gateway calls these internal endpoints, setting `x-user-id`
 * from a verified JWT. This guard re-checks it matches the route param —
 * the same defense-in-depth pattern used in user-service and fitting-service.
 */
@Injectable()
export class OwnUserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const headerUserId = request.headers['x-user-id'];
    const routeUserId = request.params.userId;

    if (!headerUserId || typeof headerUserId !== 'string' || headerUserId !== routeUserId) {
      throw new ForbiddenException({
        code: 'CROSS_CUSTOMER_ACCESS_DENIED',
        message: 'You are not allowed to access this resource.',
      });
    }

    return true;
  }
}
