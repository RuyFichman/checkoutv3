import type { AuthViewer, PublicCheckout } from '@checkout/contracts';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import 'server-only';

const API_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333/v1';

async function sessionHeaders() {
  const cookieStore = await cookies();
  return {
    accept: 'application/json',
    cookie: cookieStore.toString(),
  };
}

export const getViewer = cache(async (): Promise<AuthViewer | null> => {
  const headers = await sessionHeaders();

  if (!headers.cookie) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthViewer;
  } catch {
    return null;
  }
});

export const requireViewer = cache(async () => {
  const viewer = await getViewer();

  if (!viewer) {
    redirect('/entrar');
  }

  return viewer;
});

export async function authenticatedGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}/${path}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  });

  if (response.status === 401) {
    redirect('/entrar');
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados do painel.');
  }

  return (await response.json()) as T;
}

export const getPublicCheckout = cache(
  async (workspaceSlug: string, productSlug: string): Promise<PublicCheckout | null> => {
    try {
      const response = await fetch(`${API_URL}/public/checkout/${workspaceSlug}/${productSlug}`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) return null;
      return (await response.json()) as PublicCheckout;
    } catch {
      return null;
    }
  },
);
