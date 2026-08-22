import type { OrderListItem, OrderStatus } from '@checkout/contracts';
import { CheckCircle2, Clock3, FileCheck2, PackageOpen, QrCode, UserRound } from 'lucide-react';

const statusPresentation: Record<OrderStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Iniciado', tone: 'neutral' },
  PIX_CREATED: { label: 'Aguardando PIX', tone: 'warning' },
  PAID: { label: 'Pago', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'muted' },
  CANCELED: { label: 'Cancelado', tone: 'danger' },
  REFUNDED: { label: 'Reembolsado', tone: 'neutral' },
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

export function OrdersPanel({ orders }: { orders: OrderListItem[] }) {
  return (
    <div className="dashboard-page orders-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">OPERAÇÃO</span>
          <h1>Pedidos</h1>
          <p>Acompanhe os pedidos gerados pelo checkout e o estado atual do PIX.</p>
        </div>
        <span className="orders-count">
          {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </header>

      {orders.length === 0 ? (
        <section className="module-empty panel">
          <div className="module-empty__icon">
            <PackageOpen size={27} />
          </div>
          <span className="planned-badge">
            <QrCode size={14} /> Checkout pronto
          </span>
          <h2>Nenhum pedido por enquanto</h2>
          <p>Pedidos aparecem aqui assim que um comprador gera o PIX em um checkout publicado.</p>
        </section>
      ) : (
        <section className="orders-list" aria-label="Pedidos recentes">
          {orders.map((order) => {
            const presentation = statusPresentation[order.status];
            return (
              <article className="order-card panel" key={order.publicId}>
                <header>
                  <div>
                    <span>PEDIDO</span>
                    <strong>{order.publicId}</strong>
                  </div>
                  <span className={`order-status order-status--${presentation.tone}`}>
                    {order.status === 'PAID' ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                    {presentation.label}
                  </span>
                </header>
                <div className="order-card__body">
                  <div className="order-card__product">
                    <span>
                      <QrCode size={20} />
                    </span>
                    <div>
                      <small>PRODUTO</small>
                      <strong>{order.product.name}</strong>
                      <span>
                        {order.quantity} {order.quantity === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </div>
                  </div>
                  <div className="order-card__customer">
                    <UserRound size={17} />
                    <div>
                      <small>COMPRADOR</small>
                      <strong>{order.customerName ?? 'Não informado'}</strong>
                      <span>{order.customerEmail}</span>
                    </div>
                  </div>
                  <div className="order-card__amount">
                    <small>TOTAL</small>
                    <strong>{money(order.totalInCents)}</strong>
                    <span>{order.payment?.provider === 'MOCK' ? 'PIX simulado' : 'PIX'}</span>
                  </div>
                </div>
                <footer>
                  <span>
                    <Clock3 size={14} /> Criado em {dateTime(order.createdAt)}
                  </span>
                  {order.payment?.receiptUploadedAt ? (
                    <span>
                      <FileCheck2 size={14} /> Comprovante anexado
                    </span>
                  ) : null}
                  {order.paidAt ? (
                    <span>
                      <CheckCircle2 size={14} /> Pago em {dateTime(order.paidAt)}
                    </span>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </section>
      )}

      <p className="orders-scope-note">
        A visão detalhada, filtros, timeline e exportação chegam na Sprint 5.
      </p>
    </div>
  );
}
