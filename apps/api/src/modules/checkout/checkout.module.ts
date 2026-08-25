import { Module } from '@nestjs/common';

import { GatewaysModule } from '../gateways/gateways.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [GatewaysModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
