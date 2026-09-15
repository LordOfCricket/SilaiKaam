import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@silaikaam/types';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthUser;
  },
);
