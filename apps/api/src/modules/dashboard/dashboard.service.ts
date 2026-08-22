import { Inject, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';
import type { AuthContext } from '../auth/auth-context';
import { TenantScopeService } from '../auth/tenant-scope.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TenantScopeService) private readonly tenantScope: TenantScopeService,
  ) {}

  async summary(auth: AuthContext) {
    const [orders, paidOrders, paidRevenue, sessions, products] = await Promise.all([
      this.database.client.order.count({
        where: this.tenantScope.where(auth),
      }),
      this.database.client.order.count({
        where: this.tenantScope.where(auth, { status: 'PAID' as const }),
      }),
      this.database.client.order.aggregate({
        where: this.tenantScope.where(auth, { status: 'PAID' as const }),
        _sum: { totalInCents: true },
      }),
      this.database.client.checkoutSession.count({
        where: this.tenantScope.where(auth),
      }),
      this.database.client.product.count({
        where: this.tenantScope.where(auth, { status: 'ACTIVE' as const }),
      }),
    ]);

    return {
      revenueInCents: paidRevenue._sum?.totalInCents ?? 0,
      orders,
      paidOrders,
      checkoutSessions: sessions,
      activeProducts: products,
      approvalRate: orders ? Math.round((paidOrders / orders) * 10_000) / 100 : 0,
    };
  }
}
