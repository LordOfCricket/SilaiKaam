import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * These internal endpoints are only ever reachable from the API Gateway,
 * which sets `x-user-id` from a verified JWT and never from client input.
 * This guard is defense-in-depth: it re-checks that the caller-asserted
 * identity (header) actually matches the resource being addressed (route
 * param), matching the pattern established in user-service (Batch 2).
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
