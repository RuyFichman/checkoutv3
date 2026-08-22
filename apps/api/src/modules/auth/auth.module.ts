import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { SessionGuard } from './session.guard';
import { TenantScopeService } from './tenant-scope.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, RolesGuard, SessionGuard, TenantScopeService],
  exports: [AuthService, RolesGuard, SessionGuard, TenantScopeService],
})
export class AuthModule {}
