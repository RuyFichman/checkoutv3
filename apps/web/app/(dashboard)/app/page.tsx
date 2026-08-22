import type { Metadata } from 'next';

import {
  DashboardOverview,
  type DashboardSummary,
} from '@/src/components/dashboard/dashboard-overview';
import { authenticatedGet, requireViewer } from '@/src/lib/api';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const summary = await authenticatedGet<DashboardSummary>('dashboard/summary');

  return (
    <DashboardOverview actual={summary} firstName={viewer.user.name.split(' ')[0] ?? 'por aí'} />
  );
}
