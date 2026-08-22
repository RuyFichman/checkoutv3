import type { ReactNode } from 'react';

import { DashboardShell } from '@/src/components/dashboard/dashboard-shell';
import { requireViewer } from '@/src/lib/api';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const viewer = await requireViewer();
  return <DashboardShell viewer={viewer}>{children}</DashboardShell>;
}
