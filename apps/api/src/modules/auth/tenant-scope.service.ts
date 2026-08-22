import { Injectable } from '@nestjs/common';

import type { AuthContext } from './auth-context';

@Injectable()
export class TenantScopeService {
  where<T extends object>(auth: AuthContext, filters?: T): T & { workspaceId: string } {
    return {
      ...(filters ?? ({} as T)),
      workspaceId: auth.workspace.id,
    };
  }
}
