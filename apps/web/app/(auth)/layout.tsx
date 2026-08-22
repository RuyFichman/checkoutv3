import { BarChart3, ShieldCheck, Zap } from 'lucide-react';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getViewer } from '@/src/lib/api';

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (await getViewer()) {
    redirect('/app');
  }

  return (
    <main className="auth-shell">
      <aside className="auth-story">
        <a className="product-brand" href="/" aria-label="CheckoutV3">
          <span className="product-brand__mark">C3</span>
          <span>CheckoutV3</span>
        </a>
        <div className="auth-story__content">
          <span className="auth-story__tag">OPERAÇÃO QUE CONVERTE</span>
          <h2>Seu checkout, seus dados, suas decisões.</h2>
          <p>
            Centralize produtos, pedidos e pagamentos em um workspace projetado para crescer com
            segurança.
          </p>
          <div className="auth-benefits">
            <span>
              <ShieldCheck size={18} /> Dados isolados por negócio
            </span>
            <span>
              <BarChart3 size={18} /> Funil visível de ponta a ponta
            </span>
            <span>
              <Zap size={18} /> Operação preparada para PIX
            </span>
          </div>
        </div>
        <p className="auth-story__note">CheckoutV3 · infraestrutura própria para vender melhor</p>
      </aside>
      <div className="auth-content">{children}</div>
    </main>
  );
}
