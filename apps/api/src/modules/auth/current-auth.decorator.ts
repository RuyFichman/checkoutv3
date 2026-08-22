import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthContext, AuthenticatedRequest } from './auth-context';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
