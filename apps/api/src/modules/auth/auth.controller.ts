import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
} from '@checkout/contracts';
import { Body, Controller, Get, HttpCode, Inject, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { parseInput } from '../../common/validation/parse-input';
import { getSessionCookieName, SESSION_DURATION_MS } from './auth.constants';
import type { AuthContext } from './auth-context';
import { AuthService } from './auth.service';
import { CurrentAuth } from './current-auth.decorator';
import { SessionGuard } from './session.guard';

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.register(parseInput(registerInputSchema, body));
    setSessionCookie(reply, result.sessionToken, result.sessionExpiresAt);
    return result.viewer;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.login(parseInput(loginInputSchema, body));
    setSessionCookie(reply, result.sessionToken, result.sessionExpiresAt);
    return result.viewer;
  }

  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(@Body() body: unknown) {
    return this.authService.forgotPassword(parseInput(forgotPasswordInputSchema, body));
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: unknown) {
    return this.authService.resetPassword(parseInput(resetPasswordInputSchema, body));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentAuth() auth: AuthContext) {
    return this.authService.toViewer(auth);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.logout(auth);
    reply.clearCookie(getSessionCookieName(), { path: '/' });
  }
}
