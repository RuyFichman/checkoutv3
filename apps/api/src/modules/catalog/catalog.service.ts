import {
  deliveryConfigSchema,
  themeSettingsSchema,
  type CatalogProduct,
  type CatalogTheme,
  type CheckoutTheme,
  type CheckoutThemeInput,
  type ProductInput,
  type PublicCheckout,
} from '@checkout/contracts';
import type { Prisma } from '@checkout/db';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../common/database/database.service';
import type { AuthContext } from '../auth/auth-context';
import { TenantScopeService } from '../auth/tenant-scope.service';

const productSelect = {
  id: true,
  workspaceId: true,
  themeId: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  type: true,
  status: true,
  priceInCents: true,
  compareAtInCents: true,
  currency: true,
  quantityEnabled: true,
  deliveryConfig: true,
  redirectUrl: true,
  publishedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  theme: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

const themeSelect = {
  id: true,
  workspaceId: true,
  name: true,
  storeName: true,
  layout: true,
  logoUrl: true,
  bannerUrl: true,
  primaryColor: true,
  buttonColor: true,
  backgroundColor: true,
  textColor: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CheckoutThemeSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
type ThemeRecord = Prisma.CheckoutThemeGetPayload<{ select: typeof themeSelect }>;

function serializeProduct(product: ProductRecord): CatalogProduct {
  return {
    ...product,
    currency: 'BRL',
    deliveryConfig:
      product.deliveryConfig === null ? null : deliveryConfigSchema.parse(product.deliveryConfig),
    publishedAt: product.publishedAt?.toISOString() ?? null,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function serializeTheme(theme: ThemeRecord): CheckoutTheme {
  return {
    ...theme,
    settings: themeSettingsSchema.parse(theme.settings),
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TenantScopeService) private readonly tenantScope: TenantScopeService,
  ) {}

  async listProducts(auth: AuthContext) {
    const products = await this.database.client.product.findMany({
      where: this.tenantScope.where(auth),
      orderBy: { updatedAt: 'desc' },
      select: productSelect,
    });

    return { products: products.map(serializeProduct) };
  }

  async getProduct(auth: AuthContext, id: string) {
    return { product: serializeProduct(await this.requireProduct(auth, id)) };
  }

  async createProduct(auth: AuthContext, input: ProductInput) {
    await this.ensureSlugAvailable(auth, input.slug);
    await this.ensureThemeBelongsToWorkspace(auth, input.themeId);

    const product = await this.database.client.$transaction(async (transaction) => {
      const created = await transaction.product.create({
        data: {
          ...input,
          workspaceId: auth.workspace.id,
          status: 'DRAFT',
          currency: 'BRL',
        },
        select: productSelect,
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.product_created',
          entityType: 'Product',
          entityId: created.id,
        },
      });

      return created;
    });

    return { product: serializeProduct(product) };
  }

  async updateProduct(auth: AuthContext, id: string, input: ProductInput) {
    await this.requireProduct(auth, id);
    await this.ensureSlugAvailable(auth, input.slug, id);
    await this.ensureThemeBelongsToWorkspace(auth, input.themeId);

    const product = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.product.update({
        where: { id },
        data: input,
        select: productSelect,
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.product_updated',
          entityType: 'Product',
          entityId: id,
        },
      });

      return updated;
    });

    return { product: serializeProduct(product) };
  }

  async publishProduct(auth: AuthContext, id: string) {
    const current = await this.requireProduct(auth, id);

    if (!current.themeId) {
      throw new BadRequestException('Escolha um tema antes de publicar o produto.');
    }

    if (current.priceInCents <= 0) {
      throw new BadRequestException('Defina um preço maior que zero antes de publicar.');
    }

    const product = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.product.update({
        where: { id },
        data: { status: 'ACTIVE', publishedAt: new Date(), archivedAt: null },
        select: productSelect,
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.product_published',
          entityType: 'Product',
          entityId: id,
        },
      });
      return updated;
    });

    return { product: serializeProduct(product) };
  }

  async archiveProduct(auth: AuthContext, id: string) {
    await this.requireProduct(auth, id);
    const product = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.product.update({
        where: { id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
        select: productSelect,
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.product_archived',
          entityType: 'Product',
          entityId: id,
        },
      });
      return updated;
    });
    return { product: serializeProduct(product) };
  }

  async restoreProduct(auth: AuthContext, id: string) {
    await this.requireProduct(auth, id);
    const product = await this.database.client.product.update({
      where: { id },
      data: { status: 'DRAFT', archivedAt: null },
      select: productSelect,
    });
    return { product: serializeProduct(product) };
  }

  async deleteProduct(auth: AuthContext, id: string) {
    const product = await this.requireProduct(auth, id);
    const [sessions, orders] = await Promise.all([
      this.database.client.checkoutSession.count({ where: { productId: id } }),
      this.database.client.order.count({ where: { productId: id } }),
    ]);

    if (sessions || orders || product.status === 'ACTIVE') {
      throw new ConflictException('Arquive o produto e preserve seu histórico de vendas.');
    }

    await this.database.client.$transaction([
      this.database.client.product.delete({ where: { id } }),
      this.database.client.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.product_deleted',
          entityType: 'Product',
          entityId: id,
        },
      }),
    ]);

    return { deleted: true };
  }

  async listThemes(auth: AuthContext) {
    const themes = await this.database.client.checkoutTheme.findMany({
      where: this.tenantScope.where(auth),
      orderBy: { updatedAt: 'desc' },
      select: { ...themeSelect, _count: { select: { products: true } } },
    });

    return {
      themes: themes.map((theme): CatalogTheme => ({
        ...serializeTheme(theme),
        productCount: theme._count.products,
      })),
    };
  }

  async getTheme(auth: AuthContext, id: string) {
    return { theme: serializeTheme(await this.requireTheme(auth, id)) };
  }

  async createTheme(auth: AuthContext, input: CheckoutThemeInput) {
    const theme = await this.database.client.$transaction(async (transaction) => {
      const created = await transaction.checkoutTheme.create({
        data: { ...input, workspaceId: auth.workspace.id },
        select: themeSelect,
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.theme_created',
          entityType: 'CheckoutTheme',
          entityId: created.id,
        },
      });
      return created;
    });
    return { theme: serializeTheme(theme) };
  }

  async updateTheme(auth: AuthContext, id: string, input: CheckoutThemeInput) {
    await this.requireTheme(auth, id);
    const theme = await this.database.client.$transaction(async (transaction) => {
      const updated = await transaction.checkoutTheme.update({
        where: { id },
        data: input,
        select: themeSelect,
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.theme_updated',
          entityType: 'CheckoutTheme',
          entityId: id,
        },
      });
      return updated;
    });
    return { theme: serializeTheme(theme) };
  }

  async deleteTheme(auth: AuthContext, id: string) {
    await this.requireTheme(auth, id);
    const activeProducts = await this.database.client.product.count({
      where: this.tenantScope.where(auth, { themeId: id, status: 'ACTIVE' as const }),
    });

    if (activeProducts) {
      throw new ConflictException('Este tema está vinculado a um produto publicado.');
    }

    await this.database.client.$transaction([
      this.database.client.checkoutTheme.delete({ where: { id } }),
      this.database.client.auditLog.create({
        data: {
          workspaceId: auth.workspace.id,
          actorId: auth.user.id,
          action: 'catalog.theme_deleted',
          entityType: 'CheckoutTheme',
          entityId: id,
        },
      }),
    ]);
    return { deleted: true };
  }

  async getPublicCheckout(workspaceSlug: string, productSlug: string): Promise<PublicCheckout> {
    const record = await this.database.client.product.findFirst({
      where: {
        slug: productSlug,
        status: 'ACTIVE',
        workspace: { slug: workspaceSlug },
      },
      select: {
        ...productSelect,
        workspace: { select: { id: true, name: true, slug: true } },
        theme: { select: themeSelect },
      },
    });

    if (!record?.theme) {
      throw new NotFoundException('Checkout não encontrado.');
    }

    return {
      workspace: record.workspace,
      product: serializeProduct(record),
      theme: serializeTheme(record.theme),
    };
  }

  private async requireProduct(auth: AuthContext, id: string) {
    const product = await this.database.client.product.findFirst({
      where: this.tenantScope.where(auth, { id }),
      select: productSelect,
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  private async requireTheme(auth: AuthContext, id: string) {
    const theme = await this.database.client.checkoutTheme.findFirst({
      where: this.tenantScope.where(auth, { id }),
      select: themeSelect,
    });
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    return theme;
  }

  private async ensureThemeBelongsToWorkspace(auth: AuthContext, themeId: string | null) {
    if (!themeId) return;
    await this.requireTheme(auth, themeId);
  }

  private async ensureSlugAvailable(auth: AuthContext, slug: string, exceptId?: string) {
    const conflict = await this.database.client.product.findFirst({
      where: this.tenantScope.where(auth, {
        slug,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      }),
      select: { id: true },
    });
    if (conflict) throw new ConflictException('Este slug já está em uso neste workspace.');
  }
}
