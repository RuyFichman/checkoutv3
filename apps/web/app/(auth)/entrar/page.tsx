import type { Metadata } from 'next';

import { AuthForm } from '@/src/components/auth/auth-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
