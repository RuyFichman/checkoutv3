import type { PaymentStatus } from '@checkout/contracts';
import type { Prisma } from '@checkout/db';
import type { PixCharge } from '@checkout/gateways';
import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';

export type GatewayContext = {
  credentialId: string;
  provider: 'MERCADO_PAGO';
  workspaceId: string;
};

function safeGatewayPayload(charge: PixCharge): Prisma.InputJsonObject {
  return {
    status: charge.status,
    statusDetail: charge.statusDetail,
    ...(charge.providerTransactionId
      ? { providerTransactionId: charge.providerTransactionId }
      : {}),
    ...(charge.reference ? { reference: charge.reference } : {}),
  };
}

function terminalFailure(status: PaymentStatus) {
  return status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELED';
}

@Injectable()
export class GatewayPaymentsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async applyCharge(context: GatewayContext, charge: PixCharge) {
    return this.database.client.$transaction(async (transaction) => {
      const payment = await transaction.payment.findFirst({
        where: {
          externalId: charge.externalId,
          gatewayCredentialId: context.credentialId,
          provider: context.provider,
          order: { workspaceId: context.workspaceId },
        },
        select: {
          id: true,
          status: true,
          amountInCents: true,
          currency: true,
          order: {
            select: {
              id: true,
              status: true,
              checkoutSessionId: true,
            },
          },
        },
      });

      if (!payment) return { applied: false, changed: false };
      if (
        charge.reference !== payment.id ||
        charge.amountInCents !== payment.amountInCents ||
        charge.currency !== payment.currency
      ) {
        throw new ConflictException('A cobrança retornada não corresponde ao pagamento local.');
      }

      // A devolução é terminal para o nosso modelo atual. Uma notificação antiga de
      // pagamento processado não pode promover novamente um pagamento já devolvido.
      if (payment.status === 'REFUNDED' && charge.status !== 'REFUNDED') {
        return { applied: true, changed: false };
      }

      const reusableData = {
        rawPayload: safeGatewayPayload(charge),
        ...(charge.pixCode ? { pixCode: charge.pixCode } : {}),
        ...(charge.qrCodeImage ? { qrCodeImage: charge.qrCodeImage } : {}),
        ...(charge.ticketUrl ? { ticketUrl: charge.ticketUrl } : {}),
      } satisfies Prisma.PaymentUpdateInput;

      if (payment.status === 'PAID' && charge.status !== 'REFUNDED') {
        if (charge.status === 'PAID') {
          await transaction.payment.update({
            where: { id: payment.id },
            data: reusableData,
          });
        }
        return { applied: true, changed: false };
      }

      let changed = false;

      if (charge.status === 'PAID') {
        changed = payment.status !== 'PAID';
        const paidAt = charge.paidAt ?? new Date();
        await transaction.payment.update({
          where: { id: payment.id },
          data: { ...reusableData, status: 'PAID', paidAt },
        });
        await transaction.order.update({
          where: { id: payment.order.id },
          data: { status: 'PAID', paidAt },
        });
        await transaction.checkoutSession.update({
          where: { id: payment.order.checkoutSessionId },
          data: { status: 'PAID' },
        });
        const existingEvent = await transaction.checkoutEvent.findFirst({
          where: {
            checkoutSessionId: payment.order.checkoutSessionId,
            type: 'PAYMENT_CONFIRMED',
          },
          select: { id: true },
        });
        if (!existingEvent) {
          await transaction.checkoutEvent.create({
            data: {
              workspaceId: context.workspaceId,
              checkoutSessionId: payment.order.checkoutSessionId,
              orderId: payment.order.id,
              type: 'PAYMENT_CONFIRMED',
              payload: { provider: context.provider },
            },
          });
        }
      } else if (charge.status === 'REFUNDED') {
        changed = payment.status !== 'REFUNDED';
        await transaction.payment.update({
          where: { id: payment.id },
          data: { ...reusableData, status: 'REFUNDED' },
        });
        await transaction.order.update({
          where: { id: payment.order.id },
          data: { status: 'REFUNDED' },
        });
      } else if (terminalFailure(charge.status) && payment.status !== 'PAID') {
        changed = payment.status !== charge.status;
        await transaction.payment.update({
          where: { id: payment.id },
          data: { ...reusableData, status: charge.status },
        });
        await transaction.order.update({
          where: { id: payment.order.id },
          data: { status: charge.status === 'EXPIRED' ? 'EXPIRED' : 'CANCELED' },
        });
        await transaction.checkoutSession.update({
          where: { id: payment.order.checkoutSessionId },
          data: { status: 'EXPIRED' },
        });
      } else if (payment.status === 'CREATED' || payment.status === 'PENDING') {
        changed = payment.status !== 'PENDING';
        await transaction.payment.update({
          where: { id: payment.id },
          data: { ...reusableData, status: 'PENDING' },
        });
      }

      return { applied: true, changed };
    });
  }
}
