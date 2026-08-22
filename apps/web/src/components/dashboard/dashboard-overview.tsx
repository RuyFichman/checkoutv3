'use client';

import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export interface DashboardSummary {
  revenueInCents: number;
  orders: number;
  paidOrders: number;
  checkoutSessions: number;
  activeProducts: number;
  approvalRate: number;
}

interface DashboardOverviewProps {
  actual: DashboardSummary;
  firstName: string;
}

const demo: DashboardSummary = {
  revenueInCents: 284_590_00,
  orders: 186,
  paidOrders: 142,
  checkoutSessions: 824,
  activeProducts: 4,
  approvalRate: 76.34,
};

const chart = [22, 38, 31, 54, 47, 68, 62, 78, 71, 88, 79, 96];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function DashboardOverview({ actual, firstName }: DashboardOverviewProps) {
  const [showDemo, setShowDemo] = useState(true);
  const data = showDemo ? demo : actual;
  const empty = !showDemo && data.checkoutSessions === 0;
  const metrics = [
    {
      label: 'Receita aprovada',
      value: money(data.revenueInCents),
      helper: showDemo ? '+18,4% no período' : 'Volume real do workspace',
      icon: CircleDollarSign,
      tone: 'violet',
    },
    {
      label: 'PIX gerados',
      value: data.orders.toLocaleString('pt-BR'),
      helper: showDemo ? '23 aguardando pagamento' : 'Pedidos com pagamento iniciado',
      icon: QrCode,
      tone: 'blue',
    },
    {
      label: 'Pedidos aprovados',
      value: data.paidOrders.toLocaleString('pt-BR'),
      helper: showDemo ? '+12 esta semana' : 'Confirmações do gateway',
      icon: ShoppingBag,
      tone: 'green',
    },
    {
      label: 'Taxa de aprovação',
      value: `${data.approvalRate.toLocaleString('pt-BR')}%`,
      helper: showDemo ? 'Meta acima de 72%' : 'Aprovados sobre pedidos',
      icon: CheckCircle2,
      tone: 'amber',
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="page-heading page-heading--dashboard">
        <div>
          <span className="page-eyebrow">VISÃO GERAL</span>
          <h1>Bom trabalho, {firstName}.</h1>
          <p>Acompanhe os sinais mais importantes da sua operação.</p>
        </div>
        <div className="dashboard-mode" aria-label="Fonte dos dados">
          <button
            className={!showDemo ? 'is-active' : ''}
            type="button"
            onClick={() => setShowDemo(false)}
          >
            Dados reais
          </button>
          <button
            className={showDemo ? 'is-active' : ''}
            type="button"
            onClick={() => setShowDemo(true)}
          >
            <Sparkles size={14} /> Demonstração
          </button>
        </div>
      </header>

      {showDemo ? (
        <div className="demo-banner">
          <Sparkles size={17} />
          <span>
            Você está visualizando dados demonstrativos. Alterne para “Dados reais” quando quiser
            ver o estado atual.
          </span>
        </div>
      ) : null}

      <section className="metric-grid" aria-label="Indicadores principais">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-card__icon metric-card__icon--${metric.tone}`}>
                <Icon size={19} />
              </div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.helper}</small>
            </article>
          );
        })}
      </section>

      {empty ? (
        <section className="dashboard-empty">
          <div className="dashboard-empty__icon">
            <PackageCheck size={25} />
          </div>
          <div>
            <span className="page-eyebrow">OPERAÇÃO ZERADA</span>
            <h2>Seu painel está pronto para a primeira venda.</h2>
            <p>
              Crie um produto e conecte um gateway nas próximas sprints. Os indicadores serão
              preenchidos automaticamente a partir dos eventos reais.
            </p>
          </div>
          <Link className="button button--primary" href="/app/produtos">
            Preparar catálogo <ArrowUpRight size={16} />
          </Link>
        </section>
      ) : (
        <div className="dashboard-grid">
          <section className="panel chart-panel">
            <header className="panel__header">
              <div>
                <span>Receita aprovada</span>
                <strong>{money(data.revenueInCents)}</strong>
              </div>
              <span className="period-chip">Últimos 30 dias</span>
            </header>
            <div className="bar-chart" aria-label="Gráfico demonstrativo de receita">
              {chart.map((height, index) => (
                <span key={index} style={{ height: `${height}%` }}>
                  <i />
                </span>
              ))}
            </div>
            <div className="chart-axis">
              <span>01 ago</span>
              <span>08 ago</span>
              <span>15 ago</span>
              <span>22 ago</span>
            </div>
          </section>

          <section className="panel funnel-panel">
            <header className="panel__header">
              <div>
                <span>Funil do checkout</span>
                <strong>Conversão por etapa</strong>
              </div>
              <Eye size={18} />
            </header>
            <div className="funnel-list">
              {[
                ['Acessos', '824', 100],
                ['Identificados', '493', 60],
                ['PIX gerados', '186', 23],
                ['Aprovados', '142', 17],
              ].map(([label, value, width]) => (
                <div className="funnel-row" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <span className="funnel-track">
                    <i style={{ width: `${width}%` }} />
                  </span>
                  <small>{width}%</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="setup-panel">
        <header className="panel__header">
          <div>
            <span>Primeiros passos</span>
            <strong>Prepare sua operação</strong>
          </div>
          <span className="setup-progress">2 de 5</span>
        </header>
        <div className="setup-list">
          {[
            [
              'Conta criada',
              'Seu acesso e sessão segura estão ativos.',
              true,
              '/app/configuracoes',
            ],
            [
              'Workspace configurado',
              'Seu negócio está isolado dos demais tenants.',
              true,
              '/app/configuracoes',
            ],
            ['Crie um tema', 'Defina a identidade visual do checkout.', false, '/app/temas'],
            [
              'Cadastre um produto',
              'Informe preço, entrega e página de sucesso.',
              false,
              '/app/produtos',
            ],
            [
              'Conecte um gateway',
              'Use suas próprias credenciais para receber PIX.',
              false,
              '/app/gateways',
            ],
          ].map(([title, description, done, href]) => (
            <Link
              className={done ? 'setup-row is-done' : 'setup-row'}
              href={String(href)}
              key={String(title)}
            >
              <span className="setup-check">{done ? <CheckCircle2 size={18} /> : null}</span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
