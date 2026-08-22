import { redirect } from 'next/navigation';

import { getViewer } from '@/src/lib/api';

export default async function HomePage() {
  redirect((await getViewer()) ? '/app' : '/entrar');
}
