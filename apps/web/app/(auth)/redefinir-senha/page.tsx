import type { Metadata } from 'next';

import { AuthForm } from '@/src/components/auth/auth-form';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AuthForm mode="reset" resetToken={token} />;
}
