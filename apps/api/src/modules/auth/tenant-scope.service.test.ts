import { describe, expect, it } from 'vitest';

import type { AuthContext } from './auth-context';
import { TenantScopeService } from './tenant-scope.service';

const auth = {
  sessionId: 'session_a',
  sessionExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
  user: {
    id: 'user_a',
    email: 'owner@example.com',
    name: 'Owner',
    phone: null,
    timezone: 'America/Sao_Paulo',
  },
  workspace: { id: 'workspace_a', name: 'Workspace A', slug: 'workspace-a' },
  role: 'OWNER',
} satisfies AuthContext;

describe('TenantScopeService', () => {
  const scope = new TenantScopeService();

  it('always derives the workspace from the authenticated session', () => {
    expect(scope.where(auth, { workspaceId: 'workspace_b', status: 'PAID' })).toEqual({
      workspaceId: 'workspace_a',
      status: 'PAID',
    });
  });
});
