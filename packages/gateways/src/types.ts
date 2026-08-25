import type { PaymentStatus } from '@checkout/contracts';

export type CreatePixChargeInput = {
  amountInCents: number;
  customer: {
    document?: string;
    email: string;
    name?: string;
  };
  expiresAt: Date;
  idempotencyKey: string;
  reference: string;
};

export type PixCharge = {
  amountInCents: number;
  currency: 'BRL';
  expiresAt: Date | null;
  externalId: string;
  paidAt: Date | null;
  pixCode: string | null;
  providerTransactionId: string | null;
  qrCodeImage: string | null;
  reference: string | null;
  status: PaymentStatus;
  statusDetail: string;
  ticketUrl: string | null;
};

export type GatewayWebhookContext = {
  body: unknown;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
};

export type GatewayWebhookNotification = {
  action: string;
  externalId: string;
  rawEventId: string;
};

export interface GatewayAdapter {
  readonly provider: string;
  cancelCharge(externalId: string, idempotencyKey: string): Promise<PixCharge>;
  createPixCharge(input: CreatePixChargeInput): Promise<PixCharge>;
  getCharge(externalId: string): Promise<PixCharge>;
  parseWebhook(context: GatewayWebhookContext): GatewayWebhookNotification;
}
