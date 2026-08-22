import type {
  AuthViewer,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@checkout/contracts';
import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { DatabaseService } from '../../common/database/database.service';
import { RESET_TOKEN_DURATION_MS, SESSION_DURATION_MS } from './auth.constants';
import type { AuthContext } from './auth-context';
import { PasswordService } from './password.service';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createToken() {
  return randomBytes(32).toString('base64url');
}

function slugify(value: string) {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return [base || 'workspace', randomBytes(3).toString('hex')].join('-');
}

function toViewer(auth: AuthContext): AuthViewer {
  return {
    user: auth.user,
    workspace: auth.workspace,
    role: auth.role,
    sessionExpiresAt: auth.sessionExpiresAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.database.client.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const sessionToken = createToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const auth = await this.database.client.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          timezone: true,
        },
      });
      const workspace = await transaction.workspace.create({
        data: {
          name: input.workspaceName,
          slug: slugify(input.workspaceName),
        },
        select: { id: true, name: true, slug: true },
      });
      const membership = await transaction.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
        select: { role: true },
      });
      const session = await transaction.session.create({
        data: {
          tokenHash: hashToken(sessionToken),
          userId: user.id,
          activeWorkspaceId: workspace.id,
          expiresAt: sessionExpiresAt,
        },
        select: { id: true, expiresAt: true },
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorId: user.id,
          action: 'identity.account_created',
          entityType: 'User',
          entityId: user.id,
          metadata: { role: membership.role },
        },
      });

      return {
        sessionId: session.id,
        sessionExpiresAt: session.expiresAt,
        user,
        workspace,
        role: membership.role,
      } satisfies AuthContext;
    });

    return { viewer: toViewer(auth), sessionToken, sessionExpiresAt };
  }

  async login(input: LoginInput) {
    const user = await this.database.client.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    const validPassword =
      user?.passwordHash && (await this.passwords.verify(input.password, user.passwordHash));
    const membership = user?.memberships[0];

    if (!user || !validPassword || !membership) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const sessionToken = createToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await this.database.client.$transaction(async (transaction) => {
      const created = await transaction.session.create({
        data: {
          tokenHash: hashToken(sessionToken),
          userId: user.id,
          activeWorkspaceId: membership.workspaceId,
          expiresAt: sessionExpiresAt,
        },
        select: { id: true, expiresAt: true },
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: user.id,
          action: 'identity.session_started',
          entityType: 'Session',
          entityId: created.id,
        },
      });

      return created;
    });

    const auth: AuthContext = {
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        timezone: user.timezone,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
      },
      role: membership.role,
    };

    return { viewer: toViewer(auth), sessionToken, sessionExpiresAt };
  }

  async authenticate(sessionToken: string): Promise<AuthContext> {
    const session = await this.database.client.session.findUnique({
      where: { tokenHash: hashToken(sessionToken) },
      include: {
        user: true,
        activeWorkspace: true,
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.database.client.session.delete({ where: { id: session.id } });
      }

      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }

    const membership = await this.database.client.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.userId,
          workspaceId: session.activeWorkspaceId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Você não possui mais acesso a este workspace.');
    }

    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      await this.database.client.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return {
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone,
        timezone: session.user.timezone,
      },
      workspace: {
        id: session.activeWorkspace.id,
        name: session.activeWorkspace.name,
        slug: session.activeWorkspace.slug,
      },
      role: membership.role,
    };
  }

  async logout(auth: AuthContext) {
    await this.database.client.$transaction(async (transaction) => {
      await transaction.session.deleteMany({ where: { id: auth.sessionId } });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'identity.session_ended',
          entityType: 'Session',
          entityId: auth.sessionId,
        },
      });
    });
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.database.client.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return { accepted: true };
    }

    const token = createToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);
    const membership = user.memberships[0];

    await this.database.client.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await transaction.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt,
        },
      });

      if (membership) {
        await transaction.auditLog.create({
          data: {
            workspaceId: membership.workspaceId,
            actorId: user.id,
            action: 'identity.password_reset_requested',
            entityType: 'User',
            entityId: user.id,
          },
        });
      }
    });

    return {
      accepted: true,
      ...(process.env.NODE_ENV === 'production' ? {} : { resetToken: token }),
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const resetToken = await this.database.client.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      include: {
        user: {
          include: {
            memberships: {
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw new BadRequestException('Este link é inválido ou expirou.');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const membership = resetToken.user.memberships[0];

    await this.database.client.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await transaction.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      await transaction.session.deleteMany({ where: { userId: resetToken.userId } });

      if (membership) {
        await transaction.auditLog.create({
          data: {
            workspaceId: membership.workspaceId,
            actorId: resetToken.userId,
            action: 'identity.password_reset_completed',
            entityType: 'User',
            entityId: resetToken.userId,
          },
        });
      }
    });

    return { reset: true };
  }

  toViewer(auth: AuthContext) {
    return toViewer(auth);
  }
}
