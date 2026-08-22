import type { UpdateProfileInput, UpdateWorkspaceInput } from '@checkout/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';
import type { AuthContext } from '../auth/auth-context';

@Injectable()
export class AccountService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async updateProfile(auth: AuthContext, input: UpdateProfileInput) {
    const user = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: auth.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          timezone: true,
        },
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'identity.profile_updated',
          entityType: 'User',
          entityId: auth.user.id,
        },
      });

      return updated;
    });

    return { user };
  }

  async updateWorkspace(auth: AuthContext, input: UpdateWorkspaceInput) {
    const workspace = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.workspace.update({
        where: { id: auth.workspace.id },
        data: { name: input.name },
        select: { id: true, name: true, slug: true },
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'identity.workspace_updated',
          entityType: 'Workspace',
          entityId: auth.workspace.id,
        },
      });

      return updated;
    });

    return { workspace };
  }

  async listAudit(auth: AuthContext) {
    const events = await this.database.client.auditLog.findMany({
      where: { workspaceId: auth.workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    });

    return {
      events: events.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}
