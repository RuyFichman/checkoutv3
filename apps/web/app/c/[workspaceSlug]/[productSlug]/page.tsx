import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutPreview } from '@/src/components/catalog/checkout-preview';
import { getPublicCheckout } from '@/src/lib/api';

type PublicCheckoutPageProps = {
  params: Promise<{ workspaceSlug: string; productSlug: string }>;
};

export async function generateMetadata({ params }: PublicCheckoutPageProps): Promise<Metadata> {
  const { workspaceSlug, productSlug } = await params;
  const checkout = await getPublicCheckout(workspaceSlug, productSlug);

  if (!checkout) return { title: 'Checkout indisponível', robots: { index: false } };

  const description =
    checkout.product.description ?? `Compre ${checkout.product.name} com segurança.`;
  return {
    title: checkout.product.name,
    description,
    openGraph: { title: checkout.product.name, description, images: [] },
    twitter: { title: checkout.product.name, description, images: [] },
  };
}

export default async function PublicCheckoutPage({ params }: PublicCheckoutPageProps) {
  const { workspaceSlug, productSlug } = await params;
  const checkout = await getPublicCheckout(workspaceSlug, productSlug);

  if (!checkout) notFound();

  return (
    <main className="public-checkout-page">
      <CheckoutPreview mode="public" product={checkout.product} theme={checkout.theme} />
    </main>
  );
}
