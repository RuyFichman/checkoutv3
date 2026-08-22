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
  metadata: Record<string, string>;
};

export type PixCharge = {
  externalId: string;
  pixCode: string;
  qrCodeImage?: string;
  status: PaymentStatus;
  expiresAt: Date;
};

export type GatewayWebhookResult = {
  externalId: string;
  status: PaymentStatus;
  rawEventId: string;
};

export interface GatewayAdapter {
  readonly provider: string;
  cancelCharge(externalId: string): Promise<void>;
  createPixCharge(input: CreatePixChargeInput): Promise<PixCharge>;
  getCharge(externalId: string): Promise<PixCharge>;
  parseWebhook(headers: Record<string, string>, body: unknown): Promise<GatewayWebhookResult>;
}
