import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './common/database/database.module';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AccountModule,
    DashboardModule,
  ],
})
export class AppModule {}
