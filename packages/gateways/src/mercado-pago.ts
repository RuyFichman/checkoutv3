import type { PaymentStatus } from '@checkout/contracts';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import type {
  CreatePixChargeInput,
  GatewayAdapter,
  GatewayWebhookContext,
  GatewayWebhookNotification,
  PixCharge,
} from './types';

const moneySchema = z.union([z.string(), z.number()]);
const mercadoPagoPaymentSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    amount: moneySchema.optional(),
    date_of_expiration: z.string().optional(),
    payment_method: z
      .object({
        id: z.string().optional(),
        type: z.string().optional(),
        qr_code: z.string().optional(),
        qr_code_base64: z.string().optional(),
        ticket_url: z.string().optional(),
      })
      .passthrough()
      .optional(),
    status: z.string().optional(),
    status_detail: z.string().optional(),
  })
  .passthrough();

const mercadoPagoOrderSchema = z
  .object({
    external_reference: z.string().optional(),
    id: z.string().min(1),
    status: z.string(),
    status_detail: z.string().optional(),
    total_amount: moneySchema,
    transactions: z
      .object({
        payments: z.array(mercadoPagoPaymentSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const mercadoPagoWebhookSchema = z.object({
  action: z.string().min(1),
  data: z.object({ id: z.string().min(1) }),
  id: z.union([z.string(), z.number()]),
  type: z.literal('order'),
});

export type MercadoPagoCredentials = {
  accessToken: string;
  webhookSecret: string;
};

export type MercadoPagoAdapterOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutInMilliseconds?: number;
  webhookToleranceInMilliseconds?: number;
};

export class GatewayRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GatewayRequestError';
  }
}

export class InvalidGatewayWebhookError extends Error {
  constructor(message = 'Assinatura do webhook inválida.') {
    super(message);
    this.name = 'InvalidGatewayWebhookError';
  }
}

function formatAmount(amountInCents: number) {
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new GatewayRequestError('O valor da cobrança PIX é inválido.', null, false);
  }

  return `${Math.floor(amountInCents / 100)}.${String(amountInCents % 100).padStart(2, '0')}`;
}

function parseAmount(value: string | number) {
  const normalized = String(value);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match?.[1]) {
    throw new GatewayRequestError('O Mercado Pago retornou um valor inválido.', null, true);
  }

  const cents = Number(BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')));
  if (!Number.isSafeInteger(cents)) {
    throw new GatewayRequestError('O Mercado Pago retornou um valor fora do limite.', null, false);
  }
  return cents;
}

export function mapMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case 'processed':
      return 'PAID';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    case 'expired':
      return 'EXPIRED';
    case 'canceled':
      return 'CANCELED';
    case 'failed':
      return 'FAILED';
    case 'created':
    case 'processing':
    case 'action_required':
    case 'in_review':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}

function parseOptionalDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function expirationDuration(expiresAt: Date, now: Date) {
  const minimum = 30 * 60_000;
  const maximum = 30 * 24 * 60 * 60_000;
  const duration = Math.min(maximum, Math.max(minimum, expiresAt.getTime() - now.getTime()));
  return `PT${Math.ceil(duration / 60_000)}M`;
}

function orderToPixCharge(input: z.infer<typeof mercadoPagoOrderSchema>): PixCharge {
  const payment = input.transactions?.payments?.[0];
  const status = payment?.status ?? input.status;
  const statusDetail = payment?.status_detail ?? input.status_detail ?? status;
  const amount = payment?.amount ?? input.total_amount;
  const qrCodeBase64 = payment?.payment_method?.qr_code_base64;

  return {
    amountInCents: parseAmount(amount),
    currency: 'BRL',
    expiresAt: parseOptionalDate(payment?.date_of_expiration),
    externalId: input.id,
    paidAt: mapMercadoPagoStatus(status) === 'PAID' ? new Date() : null,
    pixCode: payment?.payment_method?.qr_code ?? null,
    providerTransactionId: payment?.id === undefined ? null : String(payment.id),
    qrCodeImage: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
    reference: input.external_reference ?? null,
    status: mapMercadoPagoStatus(status),
    statusDetail,
    ticketUrl: payment?.payment_method?.ticket_url ?? null,
  };
}

function signaturePart(header: string, name: string) {
  return header
    .split(',')
    .map((part) => part.trim().split('=', 2))
    .find(([key]) => key === name)?.[1];
}

export class MercadoPagoAdapter implements GatewayAdapter {
  readonly provider = 'MERCADO_PAGO';
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => Date;
  private readonly timeoutInMilliseconds: number;
  private readonly webhookToleranceInMilliseconds: number;

  constructor(
    private readonly credentials: MercadoPagoCredentials,
    options: MercadoPagoAdapterOptions = {},
  ) {
    this.baseUrl = options.baseUrl ?? 'https://api.mercadopago.com';
    this.fetchImplementation = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutInMilliseconds = options.timeoutInMilliseconds ?? 10_000;
    this.webhookToleranceInMilliseconds = options.webhookToleranceInMilliseconds ?? 5 * 60_000;
  }

  async createPixCharge(input: CreatePixChargeInput) {
    const amount = formatAmount(input.amountInCents);
    const order = await this.request('/v1/orders', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        type: 'online',
        total_amount: amount,
        external_reference: input.reference,
        processing_mode: 'automatic',
        transactions: {
          payments: [
            {
              amount,
              payment_method: { id: 'pix', type: 'bank_transfer' },
              expiration_time: expirationDuration(input.expiresAt, this.now()),
            },
          ],
        },
        payer: { email: input.customer.email },
      }),
    });
    const parsed = mercadoPagoOrderSchema.parse(order);
    const charge = orderToPixCharge(parsed);

    if (!charge.pixCode && charge.status === 'PENDING') {
      return this.getCharge(charge.externalId);
    }
    return charge;
  }

  async getCharge(externalId: string) {
    const order = await this.request(`/v1/orders/${encodeURIComponent(externalId)}`, {
      method: 'GET',
    });
    return orderToPixCharge(mercadoPagoOrderSchema.parse(order));
  }

  async cancelCharge(externalId: string, idempotencyKey: string) {
    const order = await this.request(`/v1/orders/${encodeURIComponent(externalId)}/cancel`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });
    return orderToPixCharge(mercadoPagoOrderSchema.parse(order));
  }

  parseWebhook(context: GatewayWebhookContext): GatewayWebhookNotification {
    const payload = mercadoPagoWebhookSchema.safeParse(context.body);
    if (!payload.success) {
      throw new InvalidGatewayWebhookError('Payload do webhook inválido.');
    }

    const signature = context.headers['x-signature'];
    const requestId = context.headers['x-request-id'];
    const queryDataId = context.query['data.id'];
    if (!signature || !requestId || !queryDataId || queryDataId !== payload.data.data.id) {
      throw new InvalidGatewayWebhookError();
    }

    const timestamp = signaturePart(signature, 'ts');
    const receivedSignature = signaturePart(signature, 'v1');
    const timestampNumber = Number(timestamp);
    if (
      !timestamp ||
      !receivedSignature ||
      !Number.isSafeInteger(timestampNumber) ||
      Math.abs(this.now().getTime() - timestampNumber) > this.webhookToleranceInMilliseconds
    ) {
      throw new InvalidGatewayWebhookError();
    }

    const manifest = `id:${queryDataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
    const expectedSignature = createHmac('sha256', this.credentials.webhookSecret)
      .update(manifest)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new InvalidGatewayWebhookError();
    }

    return {
      action: payload.data.action,
      externalId: payload.data.data.id,
      rawEventId: String(payload.data.id),
    };
  }

  private async request(path: string, init: RequestInit) {
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.credentials.accessToken}`,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(this.timeoutInMilliseconds),
      });
    } catch {
      throw new GatewayRequestError(
        'O Mercado Pago está temporariamente indisponível.',
        null,
        true,
      );
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new GatewayRequestError(
        response.status === 401 || response.status === 403
          ? 'As credenciais do Mercado Pago não foram aceitas.'
          : 'O Mercado Pago não conseguiu processar a solicitação.',
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }
    return payload;
  }
}
