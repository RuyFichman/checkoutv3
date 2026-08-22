'use client';

import type { PublicCheckout, PublicCheckoutSession } from '@checkout/contracts';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type CheckoutStep = 'identification' | 'summary' | 'payment' | 'success';

type SessionResponse = { session: PublicCheckoutSession };

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function errorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }
  return 'Não foi possível concluir esta etapa. Tente novamente.';
}

async function checkoutRequest(path: string, init?: RequestInit): Promise<SessionResponse> {
  const response = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: init?.body
      ? { 'content-type': 'application/json', ...(init.headers ?? {}) }
      : init?.headers,
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(errorMessage(payload));
  return payload as SessionResponse;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o comprovante.'));
    reader.readAsDataURL(file);
  });
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Browsers without clipboard permission use the selection fallback below.
    }
  }

  const temporary = document.createElement('textarea');
  temporary.value = value;
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.appendChild(temporary);
  temporary.select();
  document.execCommand('copy');
  temporary.remove();
}

function stepFromSession(session: PublicCheckoutSession): CheckoutStep {
  if (session.status === 'PAID') return 'success';
  if (session.status === 'PAYMENT_PENDING') return 'payment';
  if (session.status === 'IDENTIFIED') return 'summary';
  return 'identification';
}

export function PublicCheckoutFlow({ checkout }: { checkout: PublicCheckout }) {
  const { product, theme, workspace } = checkout;
  const storageKey = `checkoutv3:visitor:${workspace.slug}:${product.slug}`;
  const [session, setSession] = useState<PublicCheckoutSession | null>(null);
  const [step, setStep] = useState<CheckoutStep>('identification');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const expiryChecked = useRef(false);

  const bootstrap = useCallback(
    async (forceNew = false) => {
      setLoading(true);
      setError('');
      try {
        if (forceNew) sessionStorage.removeItem(storageKey);
        const visitorId = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
        sessionStorage.setItem(storageKey, visitorId);
        const query = new URLSearchParams(window.location.search);
        const { session: current } = await checkoutRequest(
          `public/checkout/${workspace.slug}/${product.slug}/sessions`,
          {
            method: 'POST',
            body: JSON.stringify({
              visitorId,
              tracking: {
                source: query.get('utm_source'),
                medium: query.get('utm_medium'),
                campaign: query.get('utm_campaign'),
                content: query.get('utm_content'),
                term: query.get('utm_term'),
                referrer: document.referrer || null,
              },
            }),
          },
        );
        setSession(current);
        setStep(stepFromSession(current));
        setQuantity(current.quantity);
        if (current.customer) {
          setName(current.customer.name);
          setEmail(current.customer.email);
          setCpf(current.customer.document ?? '');
        }
        expiryChecked.current = current.status === 'EXPIRED';
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Checkout temporariamente indisponível.');
      } finally {
        setLoading(false);
      }
    },
    [product.slug, storageKey, workspace.slug],
  );

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresIn = session ? Math.max(0, new Date(session.expiresAt).getTime() - now) : 0;
  const minutes = Math.floor(expiresIn / 60_000);
  const seconds = Math.floor((expiresIn % 60_000) / 1_000);

  useEffect(() => {
    if (!session || expiresIn > 0 || ['PAID', 'EXPIRED'].includes(session.status)) return;
    if (expiryChecked.current) return;
    expiryChecked.current = true;
    void checkoutRequest(`public/checkout-sessions/${session.id}`)
      .then(({ session: expired }) => setSession(expired))
      .catch(() =>
        setSession((current) => (current ? { ...current, status: 'EXPIRED' } : current)),
      );
  }, [expiresIn, session]);

  const style = {
    '--checkout-primary': theme.primaryColor,
    '--checkout-secondary': theme.settings.secondaryColor,
    '--checkout-button': theme.buttonColor,
    '--checkout-background': theme.backgroundColor,
    '--checkout-text': theme.textColor,
  } as CSSProperties;

  function applySession(current: PublicCheckoutSession) {
    setSession(current);
    setStep(stepFromSession(current));
    setQuantity(current.quantity);
  }

  async function identify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await checkoutRequest(
        `public/checkout-sessions/${session.id}/identification`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name, email, document: cpf.trim() || null }),
        },
      );
      applySession(result.session);
      setStep('summary');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Revise os dados informados.');
    } finally {
      setSubmitting(false);
    }
  }

  async function generatePix() {
    if (!session) return;
    setSubmitting(true);
    setError('');
    try {
      await checkoutRequest(`public/checkout-sessions/${session.id}/summary`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      const result = await checkoutRequest(`public/checkout-sessions/${session.id}/pix`, {
        method: 'POST',
      });
      applySession(result.session);
      setStep('payment');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o PIX.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPix() {
    const pixCode = session?.order?.payment?.pixCode;
    if (!session || !pixCode) return;
    setError('');
    try {
      await copyText(pixCode);
      await checkoutRequest(`public/checkout-sessions/${session.id}/pix/copied`, {
        method: 'POST',
      });
      setNotice('Código PIX copiado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível copiar o código.');
    }
  }

  async function uploadReceipt(file: File | undefined) {
    if (!file || !session) return;
    if (file.size > 2_000_000) {
      setError('O comprovante deve ter no máximo 2 MB.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const dataUrl = await readFile(file);
      const result = await checkoutRequest(`public/checkout-sessions/${session.id}/receipt`, {
        method: 'POST',
        body: JSON.stringify({
          dataUrl,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      applySession(result.session);
      setNotice('Comprovante anexado ao pedido.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o comprovante.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment() {
    if (!session) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await checkoutRequest(
        `public/checkout-sessions/${session.id}/mock-confirmation`,
        { method: 'POST' },
      );
      applySession(result.session);
      setStep('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar a simulação.');
    } finally {
      setSubmitting(false);
    }
  }

  const expired = session?.status === 'EXPIRED';
  const displayTotal = session?.totalInCents ?? product.priceInCents * quantity;

  return (
    <article className="checkout-flow" style={style}>
      {theme.settings.showTimer ? (
        <div className="checkout-flow__timer" aria-live="polite">
          <Clock3 size={16} />
          {expired
            ? 'Reserva expirada'
            : `Reserva por ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
        </div>
      ) : null}

      <header
        className={
          theme.settings.gradientEnabled
            ? 'checkout-flow__brand is-gradient'
            : 'checkout-flow__brand'
        }
      >
        {theme.bannerUrl ? (
          <span
            className="checkout-flow__banner"
            role="img"
            aria-label={`Banner de ${theme.storeName}`}
            style={{ backgroundImage: `url(${theme.bannerUrl})` }}
          />
        ) : null}
        <div className="checkout-flow__identity">
          {theme.logoUrl ? (
            <span
              className="checkout-flow__logo"
              role="img"
              aria-label={`Logo de ${theme.storeName}`}
              style={{ backgroundImage: `url(${theme.logoUrl})` }}
            />
          ) : (
            <span className="checkout-flow__monogram">{theme.storeName.slice(0, 2)}</span>
          )}
          <span>
            <strong>{theme.storeName}</strong>
            <small>Pagamento protegido</small>
          </span>
        </div>
      </header>

      <div className="checkout-flow__body">
        <main className="checkout-flow__content">
          <ol className="checkout-steps" aria-label="Etapas do checkout">
            {[
              ['identification', 'Identificação'],
              ['summary', 'Resumo'],
              ['payment', 'Pagamento'],
            ].map(([value, label], index) => {
              const order = ['identification', 'summary', 'payment', 'success'];
              const active = step === value || (value === 'payment' && step === 'success');
              const done = order.indexOf(step) > order.indexOf(value as CheckoutStep);
              return (
                <li className={active ? 'is-active' : done ? 'is-done' : ''} key={value}>
                  <i>{done ? <Check size={13} /> : index + 1}</i>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>

          {loading ? (
            <div className="checkout-flow__state" role="status">
              <LoaderCircle className="is-spinning" size={30} />
              <h1>Preparando seu checkout</h1>
              <p>Estamos reservando a oferta com segurança.</p>
            </div>
          ) : expired ? (
            <div className="checkout-flow__state">
              <Clock3 size={32} />
              <h1>Esta reserva expirou</h1>
              <p>Inicie uma nova sessão para atualizar o preço e gerar outro PIX.</p>
              <button type="button" onClick={() => void bootstrap(true)}>
                <RefreshCw size={16} /> Iniciar nova reserva
              </button>
            </div>
          ) : step === 'identification' ? (
            <form className="checkout-stage" onSubmit={identify}>
              <header>
                <span>IDENTIFICAÇÃO</span>
                <h1>{theme.settings.headline}</h1>
                <p>{theme.settings.supportText}</p>
              </header>
              <label>
                <span>Nome completo</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Como devemos chamar você?"
                  required
                />
              </label>
              <label>
                <span>E-mail de entrega</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  type="email"
                  placeholder="voce@email.com"
                  required
                />
              </label>
              {theme.settings.requireCpf ? (
                <label>
                  <span>CPF</span>
                  <input
                    value={cpf}
                    onChange={(event) => setCpf(event.target.value)}
                    autoComplete="off"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    required
                  />
                </label>
              ) : null}
              <button className="checkout-flow__primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <LoaderCircle className="is-spinning" size={17} />
                ) : (
                  <LockKeyhole size={17} />
                )}
                Continuar para o resumo
              </button>
            </form>
          ) : step === 'summary' ? (
            <section className="checkout-stage">
              <header>
                <span>RESUMO</span>
                <h1>Confira antes de gerar o PIX</h1>
                <p>A entrega digital será enviada para {session?.customer?.email ?? email}.</p>
              </header>
              <div className="checkout-review">
                <div>
                  <span>Comprador</span>
                  <strong>{session?.customer?.name ?? name}</strong>
                </div>
                <div>
                  <span>Forma de pagamento</span>
                  <strong>PIX simulado</strong>
                </div>
              </div>
              {product.quantityEnabled ? (
                <div className="checkout-flow__quantity">
                  <span>Quantidade</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={15} />
                    </button>
                    <strong>{quantity}</strong>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="checkout-review__total">
                <span>Total</span>
                <strong>{money(product.priceInCents * quantity)}</strong>
              </div>
              <div className="checkout-stage__actions">
                <button
                  type="button"
                  className="checkout-flow__back"
                  onClick={() => setStep('identification')}
                >
                  <ArrowLeft size={16} /> Corrigir dados
                </button>
                <button
                  type="button"
                  className="checkout-flow__primary"
                  onClick={() => void generatePix()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <LoaderCircle className="is-spinning" size={17} />
                  ) : (
                    <QrCode size={17} />
                  )}
                  Gerar PIX
                </button>
              </div>
            </section>
          ) : step === 'payment' ? (
            <section className="checkout-stage checkout-stage--payment">
              <header>
                <span>PAGAMENTO</span>
                <h1>PIX gerado com sucesso</h1>
                <p>Este é um ambiente simulado. Nenhuma transação financeira será processada.</p>
              </header>
              <div className="checkout-pix-card">
                <div className="checkout-pix-card__qr">
                  <QrCode size={72} />
                </div>
                <div>
                  <span>Valor do PIX</span>
                  <strong>{money(displayTotal)}</strong>
                  <small>Pedido {session?.order?.publicId}</small>
                </div>
              </div>
              <label className="checkout-pix-code">
                <span>PIX copia e cola</span>
                <textarea value={session?.order?.payment?.pixCode ?? ''} readOnly rows={3} />
              </label>
              <button
                type="button"
                className="checkout-flow__primary"
                onClick={() => void copyPix()}
              >
                <Clipboard size={17} /> Copiar código PIX
              </button>
              <label className="checkout-receipt">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(event) => void uploadReceipt(event.target.files?.[0])}
                  disabled={submitting}
                />
                {session?.order?.payment?.receiptUploadedAt ? (
                  <FileCheck2 size={23} />
                ) : (
                  <Upload size={23} />
                )}
                <span>
                  <strong>
                    {session?.order?.payment?.receiptFileName ?? 'Anexar comprovante'}
                  </strong>
                  <small>PNG, JPEG, WebP ou PDF de até 2 MB</small>
                </span>
              </label>
              <div className="checkout-mock-box">
                <span>GATEWAY SIMULADO</span>
                <p>
                  Use o botão abaixo para representar a confirmação que virá por webhook na Sprint
                  4.
                </p>
                <button type="button" onClick={() => void confirmPayment()} disabled={submitting}>
                  {submitting ? (
                    <LoaderCircle className="is-spinning" size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Simular pagamento aprovado
                </button>
              </div>
            </section>
          ) : (
            <section className="checkout-flow__success">
              <span>
                <CheckCircle2 size={38} />
              </span>
              <small>PAGAMENTO CONFIRMADO</small>
              <h1>Pedido aprovado!</h1>
              <p>
                Enviamos a confirmação para {session?.customer?.email}. O pedido já está disponível
                para o vendedor.
              </p>
              <div>
                <span>Pedido</span>
                <strong>{session?.order?.publicId}</strong>
              </div>
              {product.redirectUrl ? (
                <a href={product.redirectUrl}>Continuar para o conteúdo</a>
              ) : null}
            </section>
          )}

          {error ? (
            <p className="checkout-flow__error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="checkout-flow__notice" role="status">
              {notice}
            </p>
          ) : null}
          {theme.settings.showSecurityBadge ? (
            <div className="checkout-flow__security">
              <ShieldCheck size={17} /> Seus dados são usados somente para processar este pedido.
            </div>
          ) : null}
        </main>

        <aside className="checkout-flow__summary">
          <span>RESUMO DO PEDIDO</span>
          <div className="checkout-flow__product">
            {product.imageUrl ? (
              <span
                role="img"
                aria-label={product.name}
                style={{ backgroundImage: `url(${product.imageUrl})` }}
              />
            ) : (
              <span className="is-empty">C3</span>
            )}
            <div>
              <strong>{product.name}</strong>
              <small>{product.description ?? 'Acesso digital liberado após a confirmação.'}</small>
            </div>
          </div>
          <div className="checkout-flow__price-row">
            <span>Quantidade</span>
            <strong>{quantity}</strong>
          </div>
          <div className="checkout-flow__price-row">
            <span>Subtotal</span>
            <strong>{money(product.priceInCents * quantity)}</strong>
          </div>
          <div className="checkout-flow__total">
            <span>Total</span>
            <strong>{money(displayTotal)}</strong>
          </div>
          <div className="checkout-flow__payment-method">
            <QrCode size={19} />
            <span>
              <strong>PIX</strong>
              <small>Gateway simulado</small>
            </span>
            <Check size={16} />
          </div>
        </aside>
      </div>

      <footer className="checkout-flow__footer">
        Checkout seguro por <strong>CheckoutV3</strong>
      </footer>
    </article>
  );
}
