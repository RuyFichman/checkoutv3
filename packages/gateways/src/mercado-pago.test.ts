import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  InvalidGatewayWebhookError,
  mapMercadoPagoStatus,
  MercadoPagoAdapter,
} from './mercado-pago';

const now = new Date('2026-08-24T15:00:00.000Z');

function orderResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3',
    total_amount: '12.99',
    external_reference: 'payment_local_1',
    status: 'action_required',
    status_detail: 'waiting_transfer',
    transactions: {
      payments: [
        {
          id: 'PAY01JQ4S4KY8HWQ6NA5PXB65B3D3',
          amount: '12.99',
          status: 'action_required',
          status_detail: 'waiting_transfer',
          date_of_expiration: '2026-08-24T15:30:00.000Z',
          payment_method: {
            id: 'pix',
            type: 'bank_transfer',
            qr_code: '000201-checkoutv3',
            qr_code_base64: 'aW1hZ2Vt',
            ticket_url: 'https://www.mercadopago.com.br/payments/example',
          },
        },
      ],
    },
    ...overrides,
  };
}

describe('MercadoPagoAdapter', () => {
  it('creates a PIX order with integer-cent formatting and a stable idempotency key', async () => {
    const fetchMock = vi.fn(async () => Response.json(orderResponse(), { status: 201 }));
    const adapter = new MercadoPagoAdapter(
      { accessToken: 'APP_USR-test-access-token', webhookSecret: 'webhook-secret-value' },
      { fetch: fetchMock as unknown as typeof fetch, now: () => now },
    );

    const charge = await adapter.createPixCharge({
      amountInCents: 1_299,
      customer: { email: 'buyer@example.com' },
      expiresAt: new Date('2026-08-24T15:05:00.000Z'),
      idempotencyKey: 'payment_local_1',
      reference: 'payment_local_1',
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const transactions = body.transactions as { payments: Array<Record<string, unknown>> };
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer APP_USR-test-access-token');
    expect(new Headers(init.headers).get('x-idempotency-key')).toBe('payment_local_1');
    expect(body.total_amount).toBe('12.99');
    expect(transactions.payments[0]?.amount).toBe('12.99');
    expect(transactions.payments[0]?.expiration_time).toBe('PT30M');
    expect(charge).toMatchObject({
      amountInCents: 1_299,
      pixCode: '000201-checkoutv3',
      qrCodeImage: 'data:image/png;base64,aW1hZ2Vt',
      reference: 'payment_local_1',
      status: 'PENDING',
    });
  });

  it('maps the Orders API financial statuses without downgrading money to floats', () => {
    expect(mapMercadoPagoStatus('processed')).toBe('PAID');
    expect(mapMercadoPagoStatus('action_required')).toBe('PENDING');
    expect(mapMercadoPagoStatus('expired')).toBe('EXPIRED');
    expect(mapMercadoPagoStatus('canceled')).toBe('CANCELED');
    expect(mapMercadoPagoStatus('refunded')).toBe('REFUNDED');
    expect(mapMercadoPagoStatus('failed')).toBe('FAILED');
  });

  it('validates the signed order webhook and rejects tampering', () => {
    const secret = 'webhook-secret-value';
    const dataId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
    const requestId = 'request-123';
    const timestamp = String(now.getTime());
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac('sha256', secret).update(manifest).digest('hex');
    const adapter = new MercadoPagoAdapter(
      { accessToken: 'APP_USR-test-access-token', webhookSecret: secret },
      { now: () => now },
    );
    const webhook = {
      headers: {
        'x-request-id': requestId,
        'x-signature': `ts=${timestamp},v1=${signature}`,
      },
      query: { 'data.id': dataId, type: 'order' },
      body: {
        action: 'order.processed',
        data: { id: dataId },
        id: 'notification-1',
        type: 'order',
      },
    };

    expect(adapter.parseWebhook(webhook)).toEqual({
      action: 'order.processed',
      externalId: dataId,
      rawEventId: 'notification-1',
    });
    expect(() =>
      adapter.parseWebhook({
        ...webhook,
        headers: { ...webhook.headers, 'x-request-id': 'tampered' },
      }),
    ).toThrow(InvalidGatewayWebhookError);
  });
});
