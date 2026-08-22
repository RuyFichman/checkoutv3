import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CatalogProduct, CatalogTheme } from '@checkout/contracts';

import { SettingsPanel, type AuditEvent } from '@/src/components/dashboard/settings-panel';
import { ModulePlaceholder } from '@/src/components/dashboard/module-placeholder';
import { ProductsPanel } from '@/src/components/catalog/products-panel';
import { ThemesPanel } from '@/src/components/catalog/themes-panel';
import { authenticatedGet, requireViewer } from '@/src/lib/api';
import { isProductModule, productModules } from '@/src/lib/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return {
    title: isProductModule(section) ? productModules[section].label : 'Módulo',
  };
}

export default async function ModulePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const viewer = await requireViewer();

  if (!isProductModule(section)) {
    notFound();
  }

  if (section === 'configuracoes') {
    const { events } = await authenticatedGet<{ events: AuditEvent[] }>('account/audit');
    return <SettingsPanel viewer={viewer} auditEvents={events} />;
  }

  if (section === 'produtos') {
    const [{ products }, { themes }] = await Promise.all([
      authenticatedGet<{ products: CatalogProduct[] }>('products'),
      authenticatedGet<{ themes: CatalogTheme[] }>('themes'),
    ]);
    return (
      <ProductsPanel
        initialProducts={products}
        themes={themes}
        workspaceSlug={viewer.workspace.slug}
      />
    );
  }

  if (section === 'temas') {
    const { themes } = await authenticatedGet<{ themes: CatalogTheme[] }>('themes');
    return <ThemesPanel initialThemes={themes} workspaceName={viewer.workspace.name} />;
  }

  return <ModulePlaceholder module={productModules[section]} />;
}
