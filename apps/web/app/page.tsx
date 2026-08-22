import { StatusBadge, Surface } from '@checkout/ui';

const services = [
  { name: 'Painel web', detail: 'Next.js e design system', status: 'Pronto' },
  { name: 'API transacional', detail: 'NestJS com Fastify', status: 'Pronto' },
  { name: 'Processamento assíncrono', detail: 'Redis e BullMQ', status: 'Pronto' },
  { name: 'Persistência', detail: 'PostgreSQL e Prisma', status: 'Pronto' },
];

export default function HomePage() {
  return (
    <main className="foundation-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CheckoutV3 — início">
          <span className="brand-mark">C3</span>
          <span>CheckoutV3</span>
        </a>
        <StatusBadge tone="success">Sprint 0 ativa</StatusBadge>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">FUNDAÇÃO DO PRODUTO</span>
          <h1>A base do novo checkout está de pé.</h1>
          <p>
            Estrutura preparada para produtos, temas, pedidos, PIX, métricas e múltiplos gateways,
            com segurança multi-tenant desde o primeiro commit.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#architecture">
              Ver arquitetura
            </a>
            <a className="secondary-action" href="/api/health">
              Healthcheck web
            </a>
          </div>
        </div>

        <Surface className="system-card">
          <div className="system-card__header">
            <div>
              <span className="card-label">STATUS DO SISTEMA</span>
              <h2>Serviços essenciais</h2>
            </div>
            <span className="live-dot" aria-label="Sistema operacional" />
          </div>
          <div className="service-list">
            {services.map((service) => (
              <div className="service-row" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <span>{service.detail}</span>
                </div>
                <StatusBadge tone="success">{service.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="architecture" id="architecture">
        <div className="section-heading">
          <span className="eyebrow">ARQUITETURA</span>
          <h2>Simples para evoluir, sólida para transacionar.</h2>
        </div>
        <div className="principle-grid">
          <Surface>
            <span className="principle-number">01</span>
            <h3>Monólito modular</h3>
            <p>Fronteiras claras sem o custo operacional prematuro de microserviços.</p>
          </Surface>
          <Surface>
            <span className="principle-number">02</span>
            <h3>Dinheiro em centavos</h3>
            <p>Cálculos previsíveis e contratos que rejeitam valores monetários fracionados.</p>
          </Surface>
          <Surface>
            <span className="principle-number">03</span>
            <h3>Eventos auditáveis</h3>
            <p>O funil nasce de eventos imutáveis e não de métricas difíceis de reconciliar.</p>
          </Surface>
        </div>
      </section>
    </main>
  );
}
