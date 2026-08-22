import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { getSessionCookieName } from './auth.constants';
import type { AuthenticatedRequest } from './auth-context';
import { AuthService } from './auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = request.cookies[getSessionCookieName()];

    if (!token) {
      throw new UnauthorizedException('Entre para continuar.');
    }

    (request as AuthenticatedRequest).auth = await this.authService.authenticate(token);
    return true;
  }
}
