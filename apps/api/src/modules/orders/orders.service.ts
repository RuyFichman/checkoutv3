import type { OrderListItem } from '@checkout/contracts';
import type { Prisma } from '@checkout/db';
import { Inject, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';
import type { AuthContext } from '../auth/auth-context';
import { TenantScopeService } from '../auth/tenant-scope.service';

const orderListSelect = {
  publicId: true,
  status: true,
  customerName: true,
  customerEmail: true,
  quantity: true,
  totalInCents: true,
  currency: true,
  createdAt: true,
  paidAt: true,
  product: { select: { name: true, slug: true } },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      status: true,
      provider: true,
      expiresAt: true,
      receiptUploadedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderListRecord = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;

function serializeOrder(order: OrderListRecord): OrderListItem {
  const payment = order.payments[0];
  return {
    publicId: order.publicId,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    quantity: order.quantity,
    totalInCents: order.totalInCents,
    currency: 'BRL',
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    product: order.product,
    payment: payment
      ? {
          status: payment.status,
          provider: payment.provider,
          expiresAt: payment.expiresAt?.toISOString() ?? null,
          receiptUploadedAt: payment.receiptUploadedAt?.toISOString() ?? null,
        }
      : null,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TenantScopeService) private readonly tenantScope: TenantScopeService,
  ) {}

  async list(auth: AuthContext) {
    const orders = await this.database.client.order.findMany({
      where: this.tenantScope.where(auth),
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: orderListSelect,
    });

    return { orders: orders.map(serializeOrder) };
  }
}
