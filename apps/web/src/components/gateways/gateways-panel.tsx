'use client';

import type { GatewayConnection, GatewayWebhookEvent } from '@checkout/contracts';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Webhook,
  Zap,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';

export type GatewayConfiguration = {
  gateway: GatewayConnection;
  webhookEvents: GatewayWebhookEvent[];
};

type ReconciliationResult = {
  checked: number;
  updated: number;
  failures: number;
};

async function gatewayRequest<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/gateways${path}`, {
    ...init,
    headers: init?.body
      ? { 'content-type': 'application/json', ...(init.headers ?? {}) }
      : init?.headers,
  });
  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? payload.message
        : 'Não foi possível concluir a operação.',
    );
  }
  return payload as T;
}

function eventLabel(action: string) {
  const labels: Record<string, string> = {
    'order.action_required': 'Order aguardando PIX',
    'order.processed': 'Pagamento processado',
    'order.canceled': 'Order cancelada',
    'order.expired': 'Order expirada',
    'order.failed': 'Falha no pagamento',
  };
  return labels[action] ?? action;
}

export function GatewaysPanel({
  canManage,
  initialConfiguration,
}: {
  canManage: boolean;
  initialConfiguration: GatewayConfiguration;
}) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [pending, setPending] = useState<
    'connect' | 'disconnect' | 'reconcile' | `replay:${string}` | null
  >(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { gateway, webhookEvents } = configuration;

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('connect');
    setError('');
    setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const updated = await gatewayRequest<GatewayConfiguration>('/mercado-pago', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: data.get('accessToken'),
          webhookSecret: data.get('webhookSecret'),
        }),
      });
      setConfiguration(updated);
      form.reset();
      setNotice(
        gateway.connected
          ? 'Credenciais rotacionadas e armazenadas com criptografia.'
          : 'Mercado Pago conectado ao workspace.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar o gateway.');
    } finally {
      setPending(null);
    }
  }

  async function disconnect() {
    if (!window.confirm('Desconectar o Mercado Pago para novas cobranças PIX?')) return;
    setPending('disconnect');
    setError('');
    setNotice('');
    try {
      const updated = await gatewayRequest<GatewayConfiguration>('/mercado-pago', {
        method: 'DELETE',
      });
      setConfiguration(updated);
      setNotice('Gateway desativado para novas cobranças. O histórico foi preservado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível desconectar.');
    } finally {
      setPending(null);
    }
  }

  async function reconcile() {
    setPending('reconcile');
    setError('');
    setNotice('');
    try {
      const result = await gatewayRequest<ReconciliationResult>('/mercado-pago/reconcile', {
        method: 'POST',
      });
      const updated = await gatewayRequest<GatewayConfiguration>();
      setConfiguration(updated);
      setNotice(
        `Reconciliação concluída: ${result.checked} consultados, ${result.updated} atualizados e ${result.failures} falhas.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível reconciliar.');
    } finally {
      setPending(null);
    }
  }

  async function replay(eventId: string) {
    setPending(`replay:${eventId}`);
    setError('');
    setNotice('');
    try {
      const updated = await gatewayRequest<GatewayConfiguration>(
        `/webhook-events/${eventId}/replay`,
        { method: 'POST' },
      );
      setConfiguration(updated);
      setNotice('Evento reprocessado com sucesso.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível reprocessar o evento.');
    } finally {
      setPending(null);
    }
  }

  async function copyWebhookUrl() {
    if (!gateway.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(gateway.webhookUrl);
      setNotice('URL do webhook copiada.');
    } catch {
      setError('Não foi possível copiar a URL automaticamente.');
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-heading gateway-heading">
        <div>
          <span className="page-eyebrow">PAGAMENTOS PIX</span>
          <h1>Gateways</h1>
          <p>Conecte a conta que receberá as vendas deste workspace.</p>
        </div>
        <span className={gateway.connected ? 'gateway-status is-connected' : 'gateway-status'}>
          {gateway.connected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {gateway.connected ? 'Mercado Pago ativo' : 'Sem gateway real'}
        </span>
      </header>

      {error ? (
        <div className="form-message form-message--error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="form-message form-message--success" role="status">
          <Check size={15} /> {notice}
        </div>
      ) : null}

      <div className="gateway-grid">
        <form className="panel gateway-card" onSubmit={connect}>
          <header className="gateway-card__header">
            <span className="gateway-card__icon">
              <Zap size={21} />
            </span>
            <div>
              <strong>Mercado Pago</strong>
              <p>Orders API atual, exclusivamente para cobranças PIX.</p>
            </div>
          </header>
          <div className="gateway-card__body">
            <div className="gateway-security-note">
              <ShieldCheck size={18} />
              <span>
                <strong>Credenciais protegidas</strong>
                <small>
                  O Access Token e a assinatura secreta são criptografados antes de chegar ao banco
                  e nunca retornam para o navegador.
                </small>
              </span>
            </div>
            <label className="form-field">
              <span>Access Token</span>
              <input
                name="accessToken"
                type="password"
                autoComplete="off"
                minLength={20}
                maxLength={512}
                placeholder={gateway.connected ? 'Informe para rotacionar' : 'APP_USR-...'}
                required
                disabled={!canManage || pending !== null}
              />
              <small>Copie a chave privada da aplicação no painel do Mercado Pago.</small>
            </label>
            <label className="form-field">
              <span>Assinatura secreta do webhook</span>
              <input
                name="webhookSecret"
                type="password"
                autoComplete="off"
                minLength={16}
                maxLength={512}
                placeholder="Chave gerada em Webhooks"
                required
                disabled={!canManage || pending !== null}
              />
              <small>Usada para validar HMAC e rejeitar notificações forjadas.</small>
            </label>
          </div>
          <footer className="gateway-card__footer">
            {gateway.connected ? (
              <button
                className="button gateway-button--danger"
                type="button"
                onClick={() => void disconnect()}
                disabled={!canManage || pending !== null}
              >
                {pending === 'disconnect' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Unplug size={16} />
                )}
                Desconectar
              </button>
            ) : null}
            <button
              className="button button--primary"
              type="submit"
              disabled={!canManage || pending !== null}
            >
              {pending === 'connect' ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <KeyRound size={16} />
              )}
              {gateway.connected ? 'Rotacionar credenciais' : 'Conectar Mercado Pago'}
            </button>
          </footer>
          {!canManage ? (
            <p className="gateway-permission">Somente OWNER e ADMIN podem alterar credenciais.</p>
          ) : null}
        </form>

        <section className="panel gateway-card">
          <header className="gateway-card__header">
            <span className="gateway-card__icon gateway-card__icon--blue">
              <Webhook size={21} />
            </span>
            <div>
              <strong>Webhook de Orders</strong>
              <p>Confirma o pagamento sem depender do navegador do comprador.</p>
            </div>
          </header>
          <div className="gateway-card__body">
            {gateway.connected ? (
              <>
                <label className="form-field">
                  <span>URL para configurar no Mercado Pago</span>
                  <div className="gateway-copy-field">
                    <input value={gateway.webhookUrl ?? 'Configure API_PUBLIC_URL'} readOnly />
                    <button
                      type="button"
                      aria-label="Copiar URL do webhook"
                      onClick={() => void copyWebhookUrl()}
                      disabled={!gateway.webhookUrl}
                    >
                      <Clipboard size={16} />
                    </button>
                  </div>
                </label>
                {gateway.webhookUrl?.startsWith('https://') ? (
                  <div className="gateway-check">
                    <CheckCircle2 size={17} /> URL HTTPS pronta para configuração.
                  </div>
                ) : (
                  <div className="gateway-warning">
                    <AlertTriangle size={17} /> Em homologação, exponha a API por HTTPS e ajuste
                    API_PUBLIC_URL.
                  </div>
                )}
                <ol className="gateway-steps">
                  <li>Acesse sua aplicação em Suas integrações.</li>
                  <li>Abra Webhooks e informe a URL acima.</li>
                  <li>Selecione o evento Order (Mercado Pago).</li>
                  <li>Copie a assinatura gerada e salve-a junto com o Access Token.</li>
                </ol>
              </>
            ) : (
              <div className="gateway-empty">
                <Webhook size={28} />
                <strong>A URL aparece após a conexão</strong>
                <p>Até lá, checkouts deste workspace continuam usando o PIX simulado.</p>
              </div>
            )}
          </div>
          {gateway.connected ? (
            <footer className="gateway-card__footer">
              <button
                className="button gateway-button--secondary"
                type="button"
                onClick={() => void reconcile()}
                disabled={!canManage || pending !== null}
              >
                {pending === 'reconcile' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                Reconciliar pendentes
              </button>
            </footer>
          ) : null}
        </section>
      </div>

      <section className="panel gateway-events">
        <header className="panel__header">
          <div>
            <span>WEBHOOKS DE ENTRADA</span>
            <strong>Eventos recentes</strong>
          </div>
          <span className="period-chip">Últimos 10</span>
        </header>
        {webhookEvents.length ? (
          <div className="gateway-event-list">
            {webhookEvents.map((event) => (
              <div className="gateway-event" key={event.id}>
                <span className={`gateway-event__status is-${event.status.toLowerCase()}`} />
                <div>
                  <strong>{eventLabel(event.action)}</strong>
                  <small>{event.externalResourceId}</small>
                </div>
                <span>{event.attempts} tentativa(s)</span>
                <time dateTime={event.receivedAt}>
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(event.receivedAt))}
                </time>
                {event.status === 'FAILED' && canManage ? (
                  <button
                    type="button"
                    onClick={() => void replay(event.id)}
                    disabled={pending !== null}
                  >
                    {pending === `replay:${event.id}` ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Reprocessar
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="gateway-events__empty">
            Os eventos assinados do Mercado Pago aparecerão aqui.
          </div>
        )}
      </section>
    </div>
  );
}
