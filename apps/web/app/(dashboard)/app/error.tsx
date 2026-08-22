'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="dashboard-page">
      <section className="panel error-state">
        <span>
          <TriangleAlert size={25} />
        </span>
        <h1>Não foi possível carregar esta área.</h1>
        <p>Verifique a conexão com a API e tente novamente.</p>
        <button className="button button--primary" type="button" onClick={reset}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </section>
    </div>
  );
}
