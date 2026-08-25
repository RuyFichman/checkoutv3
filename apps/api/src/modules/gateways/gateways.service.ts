import {
  mercadoPagoGatewayInputSchema,
  type GatewayConnection,
  type GatewayWebhookEvent,
  type MercadoPagoGatewayInput,
} from '@checkout/contracts';
import type { Prisma } from '@checkout/db';
import {
  GatewayRequestError,
  InvalidGatewayWebhookError,
  MercadoPagoAdapter,
  type GatewayWebhookContext,
} from '@checkout/gateways';
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';
import type { AuthContext } from '../auth/auth-context';
import { CredentialVaultService } from './credential-vault.service';
import { GatewayPaymentsService, type GatewayContext } from './gateway-payments.service';

const provider = 'MERCADO_PAGO' as const;
const label = 'Principal';

const credentialSelect = {
  id: true,
  workspaceId: true,
  provider: true,
  label: true,
  encryptedCredentials: true,
  active: true,
  updatedAt: true,
} satisfies Prisma.GatewayCredentialSelect;

type CredentialRecord = Prisma.GatewayCredentialGetPayload<{ select: typeof credentialSelect }>;

function vaultContext(workspaceId: string) {
  return `${workspaceId}:${provider}`;
}

function eventStatus(event: { lastError: string | null; processedAt: Date | null }) {
  if (event.processedAt) return 'PROCESSED' as const;
  if (event.lastError) return 'FAILED' as const;
  return 'PENDING' as const;
}

@Injectable()
export class GatewaysService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CredentialVaultService) private readonly vault: CredentialVaultService,
    @Inject(GatewayPaymentsService) private readonly payments: GatewayPaymentsService,
  ) {}

  async getConfiguration(auth: AuthContext) {
    const [credential, events] = await Promise.all([
      this.database.client.gatewayCredential.findFirst({
        where: { workspaceId: auth.workspace.id, provider, label },
        select: credentialSelect,
      }),
      this.database.client.gatewayWebhookEvent.findMany({
        where: { workspaceId: auth.workspace.id, provider },
        orderBy: { receivedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          externalResourceId: true,
          attempts: true,
          lastError: true,
          receivedAt: true,
          processedAt: true,
        },
      }),
    ]);

    return {
      gateway: this.connectionSummary(credential),
      webhookEvents: events.map((event): GatewayWebhookEvent => ({
        id: event.id,
        action: event.action,
        externalResourceId: event.externalResourceId,
        attempts: event.attempts,
        status: eventStatus(event),
        receivedAt: event.receivedAt.toISOString(),
        processedAt: event.processedAt?.toISOString() ?? null,
      })),
    };
  }

  async connect(auth: AuthContext, input: MercadoPagoGatewayInput) {
    const credentials = mercadoPagoGatewayInputSchema.parse(input);
    const encryptedCredentials = this.vault.encrypt(
      JSON.stringify(credentials),
      vaultContext(auth.workspace.id),
    );

    await this.database.client.$transaction(async (transaction) => {
      const existing = await transaction.gatewayCredential.findFirst({
        where: { workspaceId: auth.workspace.id, provider, label },
        select: { id: true },
      });
      const credential = existing
        ? await transaction.gatewayCredential.update({
            where: { id: existing.id },
            data: { active: true, encryptedCredentials },
            select: { id: true },
          })
        : await transaction.gatewayCredential.create({
            data: {
              workspaceId: auth.workspace.id,
              provider,
              label,
              encryptedCredentials,
            },
            select: { id: true },
          });

      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: existing ? 'gateway.credential_rotated' : 'gateway.connected',
          entityType: 'GatewayCredential',
          entityId: credential.id,
          metadata: { provider },
        },
      });
    });

    return this.getConfiguration(auth);
  }

  async disconnect(auth: AuthContext) {
    await this.database.client.$transaction(async (transaction) => {
      const credential = await transaction.gatewayCredential.findFirst({
        where: { workspaceId: auth.workspace.id, provider, label },
        select: { id: true, active: true },
      });
      if (!credential?.active) return;

      await transaction.gatewayCredential.update({
        where: { id: credential.id },
        data: { active: false },
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'gateway.disconnected',
          entityType: 'GatewayCredential',
          entityId: credential.id,
          metadata: { provider },
        },
      });
    });

    return this.getConfiguration(auth);
  }

  async activeAdapter(workspaceId: string) {
    const credential = await this.database.client.gatewayCredential.findFirst({
      where: { workspaceId, provider, active: true },
      orderBy: { updatedAt: 'desc' },
      select: credentialSelect,
    });
    return credential ? this.adapterContext(credential) : null;
  }

  async adapterForCredential(credentialId: string, workspaceId: string) {
    const credential = await this.database.client.gatewayCredential.findFirst({
      where: { id: credentialId, workspaceId, provider },
      select: credentialSelect,
    });
    return credential ? this.adapterContext(credential) : null;
  }

  async reconcile(auth: AuthContext) {
    const active = await this.activeAdapter(auth.workspace.id);
    if (!active) throw new NotFoundException('Conecte o Mercado Pago antes de reconciliar.');

    const pendingPayments = await this.database.client.payment.findMany({
      where: {
        gatewayCredentialId: active.context.credentialId,
        provider,
        status: { in: ['CREATED', 'PENDING'] },
        externalId: { not: null },
        order: { workspaceId: auth.workspace.id },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        externalId: true,
        order: {
          select: {
            checkoutSession: { select: { expiresAt: true } },
          },
        },
      },
    });

    let checked = 0;
    let updated = 0;
    let failures = 0;
    for (const payment of pendingPayments) {
      if (!payment.externalId) continue;
      try {
        let charge = await active.adapter.getCharge(payment.externalId);
        if (
          charge.status === 'PENDING' &&
          payment.order.checkoutSession.expiresAt.getTime() <= Date.now()
        ) {
          charge = await active.adapter.cancelCharge(payment.externalId, `cancel-${payment.id}`);
        }
        const result = await this.payments.applyCharge(active.context, charge);
        checked += 1;
        if (result.changed) updated += 1;
      } catch {
        failures += 1;
      }
    }

    await this.database.client.auditLog.create({
      data: {
        workspaceId: auth.workspace.id,
        actorId: auth.user.id,
        action: 'gateway.reconciled',
        entityType: 'GatewayCredential',
        entityId: active.context.credentialId,
        metadata: { provider, checked, updated, failures },
      },
    });

    return { checked, updated, failures };
  }

  async receiveWebhook(credentialId: string, webhook: GatewayWebhookContext) {
    const credential = await this.database.client.gatewayCredential.findUnique({
      where: { id: credentialId },
      select: credentialSelect,
    });
    if (!credential || credential.provider !== provider) {
      throw new NotFoundException('Endpoint de webhook não encontrado.');
    }

    const active = this.adapterContext(credential);
    let notification;
    try {
      notification = active.adapter.parseWebhook(webhook);
    } catch (cause) {
      if (cause instanceof InvalidGatewayWebhookError) {
        throw new UnauthorizedException(cause.message);
      }
      throw cause;
    }

    const event = await this.database.client.gatewayWebhookEvent.upsert({
      where: {
        gatewayCredentialId_externalEventId: {
          gatewayCredentialId: credential.id,
          externalEventId: notification.rawEventId,
        },
      },
      update: {},
      create: {
        workspaceId: credential.workspaceId,
        gatewayCredentialId: credential.id,
        provider,
        externalEventId: notification.rawEventId,
        externalResourceId: notification.externalId,
        action: notification.action,
        payload: {
          action: notification.action,
          externalResourceId: notification.externalId,
        },
      },
      select: { id: true, processedAt: true },
    });
    if (event.processedAt) return { received: true };

    await this.database.client.gatewayWebhookEvent.update({
      where: { id: event.id },
      data: { attempts: { increment: 1 }, lastError: null },
    });

    try {
      const charge = await active.adapter.getCharge(notification.externalId);
      await this.payments.applyCharge(active.context, charge);
      await this.database.client.gatewayWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), lastError: null },
      });
      return { received: true };
    } catch (cause) {
      const message =
        cause instanceof GatewayRequestError
          ? cause.message
          : 'Não foi possível reconciliar o recurso notificado.';
      await this.database.client.gatewayWebhookEvent.update({
        where: { id: event.id },
        data: { lastError: message },
      });
      throw new ServiceUnavailableException(message);
    }
  }

  async replay(auth: AuthContext, eventId: string) {
    const event = await this.database.client.gatewayWebhookEvent.findFirst({
      where: { id: eventId, workspaceId: auth.workspace.id, provider },
      select: {
        id: true,
        externalResourceId: true,
        gatewayCredential: { select: credentialSelect },
      },
    });
    if (!event) throw new NotFoundException('Evento de webhook não encontrado.');

    const active = this.adapterContext(event.gatewayCredential);
    await this.database.client.gatewayWebhookEvent.update({
      where: { id: event.id },
      data: { attempts: { increment: 1 }, lastError: null },
    });
    try {
      const charge = await active.adapter.getCharge(event.externalResourceId);
      await this.payments.applyCharge(active.context, charge);
      await this.database.client.gatewayWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), lastError: null },
      });
    } catch (cause) {
      const message =
        cause instanceof GatewayRequestError
          ? cause.message
          : 'Não foi possível reconciliar o recurso notificado.';
      await this.database.client.gatewayWebhookEvent.update({
        where: { id: event.id },
        data: { lastError: message },
      });
      throw new ServiceUnavailableException(message);
    }

    return this.getConfiguration(auth);
  }

  private adapterContext(credential: CredentialRecord) {
    const parsed = mercadoPagoGatewayInputSchema.parse(
      JSON.parse(
        this.vault.decrypt(credential.encryptedCredentials, vaultContext(credential.workspaceId)),
      ) as unknown,
    );
    const context: GatewayContext = {
      credentialId: credential.id,
      provider,
      workspaceId: credential.workspaceId,
    };
    return { adapter: new MercadoPagoAdapter(parsed), context, credential };
  }

  private connectionSummary(credential: CredentialRecord | null): GatewayConnection {
    return {
      provider,
      connected: Boolean(credential?.active),
      active: credential?.active ?? false,
      credentialId: credential?.id ?? null,
      label: credential?.label ?? null,
      webhookUrl: credential ? this.webhookUrl(credential.id) : null,
      updatedAt: credential?.updatedAt.toISOString() ?? null,
    };
  }

  private webhookUrl(credentialId: string) {
    const configured = process.env.API_PUBLIC_URL;
    const baseUrl =
      configured ??
      (process.env.NODE_ENV === 'production'
        ? null
        : `http://localhost:${process.env.API_PORT ?? '3333'}/v1`);
    if (!baseUrl) return null;

    try {
      return new URL(
        `webhooks/mercado-pago/${credentialId}`,
        `${baseUrl.replace(/\/$/, '')}/`,
      ).toString();
    } catch {
      return null;
    }
  }
}
