import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SettingsPanel, type AuditEvent } from '@/src/components/dashboard/settings-panel';
import { ModulePlaceholder } from '@/src/components/dashboard/module-placeholder';
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

  return <ModulePlaceholder module={productModules[section]} />;
}
