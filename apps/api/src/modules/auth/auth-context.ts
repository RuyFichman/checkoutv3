import type { MembershipRole } from '@checkout/contracts';
import type { FastifyRequest } from 'fastify';

export interface AuthContext {
  sessionId: string;
  sessionExpiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    timezone: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: MembershipRole;
}

export type AuthenticatedRequest = FastifyRequest & {
  auth: AuthContext;
};
