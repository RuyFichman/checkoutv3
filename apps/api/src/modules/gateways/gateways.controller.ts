import { mercadoPagoGatewayInputSchema } from '@checkout/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers as RequestHeaders,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { parseInput } from '../../common/validation/parse-input';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';
import { GatewaysService } from './gateways.service';

function normalizeValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? String(value[0]) : value === undefined ? undefined : String(value),
    ]),
  );
}

@Controller('gateways')
@UseGuards(SessionGuard, RolesGuard)
export class GatewaysController {
  constructor(@Inject(GatewaysService) private readonly gateways: GatewaysService) {}

  @Get()
  getConfiguration(@CurrentAuth() auth: AuthContext) {
    return this.gateways.getConfiguration(auth);
  }

  @Post('mercado-pago')
  @Roles('OWNER', 'ADMIN')
  connect(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.gateways.connect(auth, parseInput(mercadoPagoGatewayInputSchema, body));
  }

  @Delete('mercado-pago')
  @Roles('OWNER', 'ADMIN')
  disconnect(@CurrentAuth() auth: AuthContext) {
    return this.gateways.disconnect(auth);
  }

  @Post('mercado-pago/reconcile')
  @Roles('OWNER', 'ADMIN')
  reconcile(@CurrentAuth() auth: AuthContext) {
    return this.gateways.reconcile(auth);
  }

  @Post('webhook-events/:eventId/replay')
  @Roles('OWNER', 'ADMIN')
  replay(@CurrentAuth() auth: AuthContext, @Param('eventId') eventId: string) {
    return this.gateways.replay(auth, eventId);
  }
}

@Controller('webhooks')
export class GatewayWebhooksController {
  constructor(@Inject(GatewaysService) private readonly gateways: GatewaysService) {}

  @Post('mercado-pago/:credentialId')
  @HttpCode(200)
  receiveMercadoPago(
    @Param('credentialId') credentialId: string,
    @RequestHeaders() headers: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.gateways.receiveWebhook(credentialId, {
      headers: normalizeValues(headers),
      query: normalizeValues(query),
      body,
    });
  }
}
