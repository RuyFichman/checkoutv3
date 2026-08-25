import {
  checkoutIdentificationInputSchema,
  themeSettingsSchema,
  type CheckoutIdentificationInput,
  type CheckoutQuantityInput,
  type CheckoutReceiptInput,
  type CheckoutSessionStatus,
  type PublicCheckoutSession,
  type PublicCheckoutSessionCreateInput,
} from '@checkout/contracts';
import type { Prisma } from '@checkout/db';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import { DatabaseService } from '../../common/database/database.service';
import { GatewayPaymentsService } from '../gateways/gateway-payments.service';
import { GatewaysService } from '../gateways/gateways.service';
import {
  buildMockPixCode,
  calculateCheckoutTotals,
  canTransitionCheckout,
} from './checkout.machine';

const publicSessionSelect = {
  id: true,
  status: true,
  quantity: true,
  unitPriceInCents: true,
  subtotalInCents: true,
  totalInCents: true,
  currency: true,
  expiresAt: true,
  customer: true,
  order: {
    select: {
      id: true,
      publicId: true,
      status: true,
      paidAt: true,
      payments: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: {
          id: true,
          externalId: true,
          gatewayCredentialId: true,
          status: true,
          provider: true,
          pixCode: true,
          qrCodeImage: true,
          ticketUrl: true,
          expiresAt: true,
          paidAt: true,
          receiptFileName: true,
          receiptUploadedAt: true,
        },
      },
    },
  },
} satisfies Prisma.CheckoutSessionSelect;

const sessionDetailSelect = {
  ...publicSessionSelect,
  workspaceId: true,
  productId: true,
  product: {
    select: {
      name: true,
      quantityEnabled: true,
      theme: { select: { settings: true } },
    },
  },
} satisfies Prisma.CheckoutSessionSelect;

type PublicSessionRecord = Prisma.CheckoutSessionGetPayload<{
  select: typeof publicSessionSelect;
}>;
type SessionDetailRecord = Prisma.CheckoutSessionGetPayload<{
  select: typeof sessionDetailSelect;
}>;
type MercadoPagoGateway = NonNullable<Awaited<ReturnType<GatewaysService['activeAdapter']>>>;

function isUniqueConstraintError(cause: unknown) {
  return cause !== null && typeof cause === 'object' && 'code' in cause && cause.code === 'P2002';
}

function serializeSession(session: PublicSessionRecord): PublicCheckoutSession {
  const customer = session.customer
    ? checkoutIdentificationInputSchema.parse(session.customer)
    : null;
  const payment = session.order?.payments[0];

  return {
    id: session.id,
    status: session.status,
    quantity: session.quantity,
    unitPriceInCents: session.unitPriceInCents,
    subtotalInCents: session.subtotalInCents,
    totalInCents: session.totalInCents,
    currency: 'BRL',
    expiresAt: session.expiresAt.toISOString(),
    customer,
    order: session.order
      ? {
          publicId: session.order.publicId,
          status: session.order.status,
          paidAt: session.order.paidAt?.toISOString() ?? null,
          payment: payment
            ? {
                status: payment.status,
                provider: payment.provider === 'MERCADO_PAGO' ? 'MERCADO_PAGO' : 'MOCK',
                pixCode: payment.pixCode,
                qrCodeImage: payment.qrCodeImage,
                ticketUrl: payment.ticketUrl,
                expiresAt: payment.expiresAt?.toISOString() ?? null,
                paidAt: payment.paidAt?.toISOString() ?? null,
                receiptFileName: payment.receiptFileName,
                receiptUploadedAt: payment.receiptUploadedAt?.toISOString() ?? null,
              }
            : null,
        }
      : null,
  };
}

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GatewaysService) private readonly gateways: GatewaysService,
    @Inject(GatewayPaymentsService) private readonly gatewayPayments: GatewayPaymentsService,
  ) {}

  async createSession(
    workspaceSlug: string,
    productSlug: string,
    input: PublicCheckoutSessionCreateInput,
  ) {
    const product = await this.database.client.product.findFirst({
      where: {
        slug: productSlug,
        status: 'ACTIVE',
        workspace: { slug: workspaceSlug },
      },
      select: {
        id: true,
        workspaceId: true,
        priceInCents: true,
        currency: true,
        theme: { select: { settings: true } },
      },
    });

    if (!product?.theme) {
      throw new NotFoundException('Checkout não encontrado.');
    }

    const settings = themeSettingsSchema.parse(product.theme.settings);
    const totals = calculateCheckoutTotals(product.priceInCents, 1, false);
    const expiresAt = new Date(Date.now() + settings.timerMinutes * 60_000);

    let session: PublicSessionRecord;
    try {
      session = await this.database.client.checkoutSession.upsert({
        where: {
          productId_visitorId: {
            productId: product.id,
            visitorId: input.visitorId,
          },
        },
        update: {},
        create: {
          workspaceId: product.workspaceId,
          productId: product.id,
          visitorId: input.visitorId,
          tracking: input.tracking ?? undefined,
          expiresAt,
          unitPriceInCents: product.priceInCents,
          currency: product.currency,
          ...totals,
          events: {
            create: {
              workspaceId: product.workspaceId,
              type: 'CHECKOUT_ACCESSED',
              payload: { productSlug },
            },
          },
        },
        select: publicSessionSelect,
      });
    } catch (cause) {
      if (!isUniqueConstraintError(cause)) throw cause;

      session = await this.database.client.checkoutSession.findUniqueOrThrow({
        where: {
          productId_visitorId: {
            productId: product.id,
            visitorId: input.visitorId,
          },
        },
        select: publicSessionSelect,
      });
    }

    return { session: await this.resolveExpiration(session) };
  }

  async getSession(sessionId: string) {
    const session = await this.requireSession(sessionId);
    return { session: serializeSession(session) };
  }

  async identify(sessionId: string, input: CheckoutIdentificationInput) {
    const session = await this.requireMutableSession(sessionId);
    this.assertTransition(session.status, 'IDENTIFIED');

    const settings = themeSettingsSchema.parse(session.product.theme?.settings);
    if (settings.requireCpf && !input.document) {
      throw new BadRequestException('Informe o CPF para continuar.');
    }

    await this.database.client.$transaction(async (transaction) => {
      await transaction.checkoutSession.update({
        where: { id: session.id },
        data: { customer: input, status: 'IDENTIFIED' },
      });
      await this.recordEventOnce(transaction, session, 'IDENTIFICATION_SUBMITTED', undefined, {
        hasDocument: Boolean(input.document),
      });
    });

    return this.getSession(session.id);
  }

  async confirmSummary(sessionId: string, input: CheckoutQuantityInput) {
    const session = await this.requireMutableSession(sessionId);
    if (session.status !== 'IDENTIFIED') {
      throw new ConflictException('Identifique o comprador antes de confirmar o resumo.');
    }

    const totals = calculateCheckoutTotals(
      session.unitPriceInCents,
      input.quantity,
      session.product.quantityEnabled,
    );

    await this.database.client.$transaction(async (transaction) => {
      await transaction.checkoutSession.update({
        where: { id: session.id },
        data: totals,
      });
      await this.recordEventOnce(transaction, session, 'DELIVERY_SUBMITTED', undefined, {
        quantity: totals.quantity,
        delivery: 'EMAIL',
      });
    });

    return this.getSession(session.id);
  }

  async createPix(sessionId: string): Promise<{ session: PublicCheckoutSession }> {
    const session = await this.requireMutableSession(sessionId);

    if (session.order) {
      const payment = session.order.payments[0];
      if (!payment || payment.provider === 'MOCK') {
        return { session: serializeSession(session) };
      }
      if (payment.provider !== 'MERCADO_PAGO' || !payment.gatewayCredentialId) {
        throw new ConflictException('O pagamento não possui uma credencial de gateway válida.');
      }
      const gateway = await this.gateways.adapterForCredential(
        payment.gatewayCredentialId,
        session.workspaceId,
      );
      if (!gateway) {
        throw new ConflictException('A credencial usada neste pagamento não está disponível.');
      }
      return this.completeMercadoPagoPix(session, {
        gateway,
        orderId: session.order.id,
        paymentId: payment.id,
        externalId: payment.externalId,
      });
    }

    if (session.status !== 'IDENTIFIED' || !session.customer) {
      throw new ConflictException('Confirme a identificação e o resumo antes do pagamento.');
    }

    const deliveryEvent = await this.database.client.checkoutEvent.findFirst({
      where: { checkoutSessionId: session.id, type: 'DELIVERY_SUBMITTED' },
      select: { id: true },
    });
    if (!deliveryEvent) {
      throw new ConflictException('Confirme o resumo antes de gerar o PIX.');
    }

    this.assertTransition(session.status, 'PAYMENT_PENDING');
    const customer = checkoutIdentificationInputSchema.parse(session.customer);
    const gateway = await this.gateways.activeAdapter(session.workspaceId);

    if (!gateway) {
      return this.createMockPixCharge(session, customer);
    }

    const publicId = `C3-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    let localPayment: { orderId: string; paymentId: string };
    try {
      localPayment = await this.database.client.$transaction(async (transaction) => {
        const order = await transaction.order.create({
          data: {
            publicId,
            workspaceId: session.workspaceId,
            productId: session.productId,
            checkoutSessionId: session.id,
            status: 'PENDING',
            customerEmail: customer.email,
            customerName: customer.name,
            customerDocument: customer.document,
            quantity: session.quantity,
            subtotalInCents: session.subtotalInCents,
            totalInCents: session.totalInCents,
            currency: session.currency,
          },
        });

        const payment = await transaction.payment.create({
          data: {
            orderId: order.id,
            gatewayCredentialId: gateway.context.credentialId,
            provider: 'MERCADO_PAGO',
            status: 'CREATED',
            amountInCents: session.totalInCents,
            currency: session.currency,
            expiresAt: session.expiresAt,
          },
          select: { id: true },
        });
        await transaction.checkoutEvent.create({
          data: {
            workspaceId: session.workspaceId,
            checkoutSessionId: session.id,
            orderId: order.id,
            type: 'PAYMENT_STARTED',
            payload: { provider: 'MERCADO_PAGO' },
          },
        });
        return { orderId: order.id, paymentId: payment.id };
      });
    } catch (cause) {
      if (!isUniqueConstraintError(cause)) throw cause;
      return this.createPix(session.id);
    }

    return this.completeMercadoPagoPix(session, {
      gateway,
      orderId: localPayment.orderId,
      paymentId: localPayment.paymentId,
      externalId: null,
    });
  }

  private async createMockPixCharge(
    session: SessionDetailRecord,
    customer: CheckoutIdentificationInput,
  ) {
    const publicId = `C3-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const externalId = randomUUID();
    const pixCode = buildMockPixCode({
      amountInCents: session.totalInCents,
      externalId,
      orderPublicId: publicId,
    });

    await this.database.client.$transaction(async (transaction) => {
      const order = await transaction.order.create({
        data: {
          publicId,
          workspaceId: session.workspaceId,
          productId: session.productId,
          checkoutSessionId: session.id,
          status: 'PIX_CREATED',
          customerEmail: customer.email,
          customerName: customer.name,
          customerDocument: customer.document,
          quantity: session.quantity,
          subtotalInCents: session.subtotalInCents,
          totalInCents: session.totalInCents,
          currency: session.currency,
        },
      });

      await transaction.payment.create({
        data: {
          orderId: order.id,
          provider: 'MOCK',
          externalId,
          status: 'PENDING',
          amountInCents: session.totalInCents,
          currency: session.currency,
          pixCode,
          expiresAt: session.expiresAt,
          rawPayload: { simulated: true },
        },
      });
      await transaction.checkoutSession.update({
        where: { id: session.id },
        data: { status: 'PAYMENT_PENDING' },
      });
      await transaction.checkoutEvent.createMany({
        data: [
          {
            workspaceId: session.workspaceId,
            checkoutSessionId: session.id,
            orderId: order.id,
            type: 'PAYMENT_STARTED',
          },
          {
            workspaceId: session.workspaceId,
            checkoutSessionId: session.id,
            orderId: order.id,
            type: 'PIX_CREATED',
            payload: { provider: 'MOCK', expiresAt: session.expiresAt.toISOString() },
          },
        ],
      });
    });

    return this.getSession(session.id);
  }

  private async completeMercadoPagoPix(
    session: SessionDetailRecord,
    input: {
      gateway: MercadoPagoGateway;
      orderId: string;
      paymentId: string;
      externalId: string | null;
    },
  ) {
    const customer = checkoutIdentificationInputSchema.parse(session.customer);
    const charge = input.externalId
      ? await input.gateway.adapter.getCharge(input.externalId)
      : await input.gateway.adapter.createPixCharge({
          amountInCents: session.totalInCents,
          customer: {
            email: customer.email,
            name: customer.name,
            ...(customer.document ? { document: customer.document } : {}),
          },
          expiresAt: session.expiresAt,
          idempotencyKey: input.paymentId,
          reference: input.paymentId,
        });

    if (
      charge.reference !== input.paymentId ||
      charge.amountInCents !== session.totalInCents ||
      charge.currency !== session.currency
    ) {
      throw new ConflictException('A cobrança retornada não corresponde ao pagamento local.');
    }

    await this.database.client.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUniqueOrThrow({
        where: { id: input.paymentId },
        select: { status: true },
      });
      await transaction.payment.update({
        where: { id: input.paymentId },
        data: {
          externalId: charge.externalId,
          ...(payment.status === 'CREATED' || payment.status === 'PENDING'
            ? { status: 'PENDING' as const }
            : {}),
          ...(charge.pixCode ? { pixCode: charge.pixCode } : {}),
          ...(charge.qrCodeImage ? { qrCodeImage: charge.qrCodeImage } : {}),
          ...(charge.ticketUrl ? { ticketUrl: charge.ticketUrl } : {}),
          rawPayload: {
            status: charge.status,
            statusDetail: charge.statusDetail,
            ...(charge.providerTransactionId
              ? { providerTransactionId: charge.providerTransactionId }
              : {}),
            reference: input.paymentId,
          },
        },
      });
      await transaction.order.updateMany({
        where: { id: input.orderId, status: { notIn: ['PAID', 'REFUNDED'] } },
        data: { status: 'PIX_CREATED' },
      });
      await transaction.checkoutSession.updateMany({
        where: { id: session.id, status: { not: 'PAID' } },
        data: { status: 'PAYMENT_PENDING' },
      });
      const pixCreated = await transaction.checkoutEvent.findFirst({
        where: { checkoutSessionId: session.id, type: 'PIX_CREATED' },
        select: { id: true },
      });
      if (!pixCreated) {
        await transaction.checkoutEvent.create({
          data: {
            workspaceId: session.workspaceId,
            checkoutSessionId: session.id,
            orderId: input.orderId,
            type: 'PIX_CREATED',
            payload: {
              provider: 'MERCADO_PAGO',
              expiresAt: session.expiresAt.toISOString(),
            },
          },
        });
      }
    });

    await this.gatewayPayments.applyCharge(input.gateway.context, charge);
    return this.getSession(session.id);
  }

  async markPixCopied(sessionId: string) {
    const session = await this.requireMutableSession(sessionId);
    const payment = session.order?.payments[0];
    if (!session.order || !payment?.pixCode) {
      throw new ConflictException('Gere o PIX antes de copiar o código.');
    }

    await this.database.client.$transaction((transaction) =>
      this.recordEventOnce(transaction, session, 'PIX_COPIED', session.order?.id),
    );
    return this.getSession(session.id);
  }

  async uploadReceipt(sessionId: string, input: CheckoutReceiptInput) {
    const session = await this.requireMutableSession(sessionId);
    const payment = session.order?.payments[0];
    if (!session.order || !payment || session.status !== 'PAYMENT_PENDING') {
      throw new ConflictException('Gere um PIX pendente antes de enviar o comprovante.');
    }
    const order = session.order;

    const encoded = input.dataUrl.split(',', 2)[1] ?? '';
    const decodedSize = Buffer.from(encoded, 'base64').byteLength;
    if (decodedSize !== input.size) {
      throw new BadRequestException('O tamanho informado não corresponde ao comprovante enviado.');
    }

    const uploadedAt = new Date();
    await this.database.client.$transaction(async (transaction) => {
      await transaction.payment.updateMany({
        where: { id: payment.id, orderId: order.id },
        data: {
          receiptUrl: input.dataUrl,
          receiptFileName: input.fileName,
          receiptUploadedAt: uploadedAt,
        },
      });
      await this.recordEventOnce(transaction, session, 'RECEIPT_UPLOADED', order.id, {
        fileName: input.fileName,
        contentType: input.contentType,
        size: input.size,
      });
    });

    return this.getSession(session.id);
  }

  async confirmMockPayment(sessionId: string) {
    const session = await this.requireMutableSession(sessionId);
    if (session.status === 'PAID') {
      return { session: serializeSession(session) };
    }
    if (session.status !== 'PAYMENT_PENDING' || !session.order) {
      throw new ConflictException('Gere o PIX antes de simular a confirmação.');
    }
    const order = session.order;
    if (order.payments[0]?.provider !== 'MOCK') {
      throw new ConflictException('Pagamentos reais são confirmados somente pelo gateway.');
    }

    const paidAt = new Date();

    await this.database.client.$transaction(async (transaction) => {
      await transaction.payment.updateMany({
        where: { orderId: order.id, provider: 'MOCK', status: 'PENDING' },
        data: { status: 'PAID', paidAt },
      });
      await transaction.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt },
      });
      await transaction.checkoutSession.update({
        where: { id: session.id },
        data: { status: 'PAID' },
      });
      await this.recordEventOnce(transaction, session, 'PAYMENT_CONFIRMED', order.id, {
        provider: 'MOCK',
      });
    });

    return this.getSession(session.id);
  }

  private async requireMutableSession(sessionId: string) {
    const session = await this.requireSession(sessionId);
    if (session.status === 'EXPIRED') {
      throw new GoneException('Esta sessão de checkout expirou.');
    }
    if (session.status === 'ABANDONED') {
      throw new ConflictException('Esta sessão de checkout foi encerrada.');
    }
    return session;
  }

  private async requireSession(sessionId: string): Promise<SessionDetailRecord> {
    let session = await this.loadSession(sessionId);
    if (!session) throw new NotFoundException('Sessão de checkout não encontrada.');
    session = await this.refreshGatewayPayment(session);
    return this.expireSessionIfNeeded(session);
  }

  private loadSession(sessionId: string) {
    return this.database.client.checkoutSession.findUnique({
      where: { id: sessionId },
      select: sessionDetailSelect,
    });
  }

  private async refreshGatewayPayment(session: SessionDetailRecord) {
    const payment = session.order?.payments[0];
    if (
      payment?.provider !== 'MERCADO_PAGO' ||
      !payment.externalId ||
      !payment.gatewayCredentialId ||
      payment.status === 'PAID' ||
      payment.status === 'REFUNDED'
    ) {
      return session;
    }

    const gateway = await this.gateways.adapterForCredential(
      payment.gatewayCredentialId,
      session.workspaceId,
    );
    if (!gateway) return session;

    try {
      const charge = await gateway.adapter.getCharge(payment.externalId);
      await this.gatewayPayments.applyCharge(gateway.context, charge);
      return (await this.loadSession(session.id)) ?? session;
    } catch {
      return session;
    }
  }

  private async resolveExpiration(session: PublicSessionRecord) {
    if (
      session.status === 'PAID' ||
      session.status === 'EXPIRED' ||
      session.expiresAt.getTime() > Date.now()
    ) {
      return serializeSession(session);
    }
    const expired = await this.requireSession(session.id);
    return serializeSession(expired);
  }

  private async expireSessionIfNeeded(session: SessionDetailRecord) {
    if (
      session.status === 'PAID' ||
      session.status === 'EXPIRED' ||
      session.expiresAt.getTime() > Date.now()
    ) {
      return session;
    }

    const payment = session.order?.payments[0];
    if (
      payment?.provider === 'MERCADO_PAGO' &&
      payment.externalId &&
      payment.gatewayCredentialId &&
      (payment.status === 'CREATED' || payment.status === 'PENDING')
    ) {
      const gateway = await this.gateways.adapterForCredential(
        payment.gatewayCredentialId,
        session.workspaceId,
      );
      if (gateway) {
        try {
          const charge = await gateway.adapter.cancelCharge(
            payment.externalId,
            `cancel-${payment.id}`,
          );
          await this.gatewayPayments.applyCharge(gateway.context, charge);
          const canceled = await this.loadSession(session.id);
          if (canceled?.status === 'PAID' || canceled?.status === 'EXPIRED') return canceled;
        } catch {
          // A reconciliação mantém pagamentos remotos pendentes visíveis para nova tentativa.
        }
      }
    }

    await this.database.client.$transaction(async (transaction) => {
      const result = await transaction.checkoutSession.updateMany({
        where: { id: session.id, status: { notIn: ['PAID', 'EXPIRED'] } },
        data: { status: 'EXPIRED' },
      });
      if (!result.count) return;

      const order = await transaction.order.findUnique({
        where: { checkoutSessionId: session.id },
        select: { id: true },
      });
      if (order) {
        await transaction.order.updateMany({
          where: { id: order.id, status: { not: 'PAID' } },
          data: { status: 'EXPIRED' },
        });
        await transaction.payment.updateMany({
          where: {
            orderId: order.id,
            provider: 'MOCK',
            status: { in: ['CREATED', 'PENDING'] },
          },
          data: { status: 'EXPIRED' },
        });
      }
      await transaction.checkoutEvent.create({
        data: {
          workspaceId: session.workspaceId,
          checkoutSessionId: session.id,
          orderId: order?.id,
          type: 'CHECKOUT_EXPIRED',
        },
      });
    });

    return this.database.client.checkoutSession.findUniqueOrThrow({
      where: { id: session.id },
      select: sessionDetailSelect,
    });
  }

  private assertTransition(current: CheckoutSessionStatus, target: CheckoutSessionStatus) {
    if (!canTransitionCheckout(current, target)) {
      throw new ConflictException('Esta etapa não está disponível no estado atual do checkout.');
    }
  }

  private async recordEventOnce(
    transaction: Prisma.TransactionClient,
    session: Pick<SessionDetailRecord, 'id' | 'workspaceId'>,
    type:
      | 'IDENTIFICATION_SUBMITTED'
      | 'DELIVERY_SUBMITTED'
      | 'PIX_COPIED'
      | 'RECEIPT_UPLOADED'
      | 'PAYMENT_CONFIRMED',
    orderId?: string,
    payload?: Prisma.InputJsonValue,
  ) {
    const exists = await transaction.checkoutEvent.findFirst({
      where: { checkoutSessionId: session.id, type },
      select: { id: true },
    });
    if (exists) return;

    await transaction.checkoutEvent.create({
      data: {
        workspaceId: session.workspaceId,
        checkoutSessionId: session.id,
        orderId,
        type,
        payload,
      },
    });
  }
}
