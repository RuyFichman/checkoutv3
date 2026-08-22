import { updateProfileInputSchema, updateWorkspaceInputSchema } from '@checkout/contracts';
import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';

import { parseInput } from '../../common/validation/parse-input';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';
import { AccountService } from './account.service';

@Controller('account')
@UseGuards(SessionGuard, RolesGuard)
export class AccountController {
  constructor(@Inject(AccountService) private readonly accountService: AccountService) {}

  @Patch('profile')
  updateProfile(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.accountService.updateProfile(auth, parseInput(updateProfileInputSchema, body));
  }

  @Patch('workspace')
  @Roles('OWNER', 'ADMIN')
  updateWorkspace(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.accountService.updateWorkspace(auth, parseInput(updateWorkspaceInputSchema, body));
  }

  @Get('audit')
  @Roles('OWNER', 'ADMIN')
  listAudit(@CurrentAuth() auth: AuthContext) {
    return this.accountService.listAudit(auth);
  }
}
