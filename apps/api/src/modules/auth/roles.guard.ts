import type { MembershipRole } from '@checkout/contracts';
import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './auth-context';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const allowedRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!allowedRoles.includes(request.auth.role)) {
      throw new ForbiddenException('Seu perfil não permite realizar esta ação.');
    }

    return true;
  }
}
