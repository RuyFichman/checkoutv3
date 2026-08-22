import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { SessionGuard } from '../auth/session.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentAuth() auth: AuthContext) {
    return this.dashboardService.summary(auth);
  }
}
