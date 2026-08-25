import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CredentialVaultService } from './credential-vault.service';
import { GatewayPaymentsService } from './gateway-payments.service';
import { GatewaysController, GatewayWebhooksController } from './gateways.controller';
import { GatewaysService } from './gateways.service';

@Module({
  imports: [AuthModule],
  controllers: [GatewaysController, GatewayWebhooksController],
  providers: [CredentialVaultService, GatewayPaymentsService, GatewaysService],
  exports: [GatewayPaymentsService, GatewaysService],
})
export class GatewaysModule {}
