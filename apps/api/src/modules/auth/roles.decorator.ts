import type { MembershipRole } from '@checkout/contracts';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'membership-roles';
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
