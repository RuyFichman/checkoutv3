import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import './sprint1.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.WEB_ORIGIN ?? 'http://localhost:3000'),
  title: {
    default: 'CheckoutV3',
    template: '%s | CheckoutV3',
  },
  description: 'Operação de checkout, pedidos e conversão em um só workspace.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'CheckoutV3',
    description: 'Operação de checkout, pedidos e conversão em um só workspace.',
    images: [
      {
        url: '/og-checkoutv3.png',
        width: 1744,
        height: 907,
        alt: 'CheckoutV3 — gestão segura de checkout e conversão',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CheckoutV3',
    description: 'Operação de checkout, pedidos e conversão em um só workspace.',
    images: ['/og-checkoutv3.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
