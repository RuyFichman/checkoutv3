import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { SessionGuard } from '../auth/session.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.ordersService.list(auth);
  }
}
