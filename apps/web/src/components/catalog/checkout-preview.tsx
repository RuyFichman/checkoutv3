'use client';

import type {
  CheckoutTheme,
  CheckoutThemeInput,
  Product,
  ThemeSettings,
} from '@checkout/contracts';
import { Check, Clock3, LockKeyhole, Minus, Plus, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type PreviewTheme = Pick<
  CheckoutTheme | CheckoutThemeInput,
  | 'storeName'
  | 'logoUrl'
  | 'bannerUrl'
  | 'primaryColor'
  | 'buttonColor'
  | 'backgroundColor'
  | 'textColor'
> & { settings: ThemeSettings };

type PreviewProduct = Pick<
  Product,
  'name' | 'description' | 'imageUrl' | 'priceInCents' | 'compareAtInCents' | 'quantityEnabled'
>;

interface CheckoutPreviewProps {
  mode?: 'preview' | 'public';
  product: PreviewProduct;
  theme: PreviewTheme;
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

export function CheckoutPreview({ mode = 'preview', product, theme }: CheckoutPreviewProps) {
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const style = {
    '--checkout-primary': theme.primaryColor,
    '--checkout-secondary': theme.settings.secondaryColor,
    '--checkout-button': theme.buttonColor,
    '--checkout-background': theme.backgroundColor,
    '--checkout-text': theme.textColor,
  } as React.CSSProperties;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'public') {
      setNotice('Produto pronto para a etapa de pagamento da Sprint 3.');
    }
  }

  return (
    <article className={`checkout-canvas checkout-canvas--${mode}`} style={style}>
      {theme.settings.showTimer ? (
        <div className="checkout-timer">
          <Clock3 size={15} /> Oferta reservada por {theme.settings.timerMinutes}:00
        </div>
      ) : null}
      <header
        className={theme.settings.gradientEnabled ? 'checkout-brand is-gradient' : 'checkout-brand'}
      >
        {theme.bannerUrl ? (
          <span
            className="checkout-brand__banner"
            role="img"
            aria-label={`Banner de ${theme.storeName}`}
            style={{ backgroundImage: `url(${theme.bannerUrl})` }}
          />
        ) : null}
        <div className="checkout-brand__identity">
          {theme.logoUrl ? (
            <span
              className="checkout-brand__logo"
              role="img"
              aria-label={`Logo de ${theme.storeName}`}
              style={{ backgroundImage: `url(${theme.logoUrl})` }}
            />
          ) : (
            <span className="checkout-brand__monogram">{theme.storeName.slice(0, 2)}</span>
          )}
          <div>
            <strong>{theme.storeName}</strong>
            <small>Checkout protegido</small>
          </div>
        </div>
      </header>

      <div className="checkout-main">
        <form className="checkout-form" onSubmit={submit}>
          <div className="checkout-copy">
            <span>ÚLTIMO PASSO</span>
            <h1>{theme.settings.headline}</h1>
            <p>{theme.settings.supportText}</p>
          </div>

          <section className="checkout-section">
            <div className="checkout-section__title">
              <i>1</i>
              <strong>Seus dados</strong>
            </div>
            <label>
              <span>Nome completo</span>
              <input placeholder="Como devemos chamar você?" required={mode === 'public'} />
            </label>
            <label>
              <span>E-mail</span>
              <input type="email" placeholder="voce@email.com" required={mode === 'public'} />
            </label>
            {theme.settings.requireCpf ? (
              <label>
                <span>CPF</span>
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  required={mode === 'public'}
                />
              </label>
            ) : null}
          </section>

          <section className="checkout-section checkout-section--payment">
            <div className="checkout-section__title">
              <i>2</i>
              <strong>Pagamento</strong>
            </div>
            <div className="checkout-pix">
              <span>PIX</span>
              <small>Aprovação rápida e segura</small>
              <Check size={17} />
            </div>
          </section>

          <button className="checkout-submit" type="submit">
            <LockKeyhole size={17} /> Continuar para pagamento
          </button>
          {notice ? (
            <p className="checkout-notice" role="status">
              {notice}
            </p>
          ) : null}
          {theme.settings.showSecurityBadge ? (
            <div className="checkout-security">
              <ShieldCheck size={17} />
              <span>Seus dados estão protegidos por uma conexão segura.</span>
            </div>
          ) : null}
        </form>

        <aside className="checkout-summary">
          <span className="checkout-summary__eyebrow">RESUMO DO PEDIDO</span>
          <div className="checkout-product">
            {product.imageUrl ? (
              <span
                className="checkout-product__image"
                role="img"
                aria-label={product.name}
                style={{ backgroundImage: `url(${product.imageUrl})` }}
              />
            ) : (
              <span className="checkout-product__image checkout-product__image--empty">C3</span>
            )}
            <div>
              <strong>{product.name}</strong>
              <small>{product.description ?? 'Acesso digital liberado após a compra.'}</small>
            </div>
          </div>
          {product.quantityEnabled ? (
            <div className="checkout-quantity">
              <span>Quantidade</span>
              <div>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={14} />
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ) : null}
          <div className="checkout-price-row">
            <span>Subtotal</span>
            <strong>{money(product.priceInCents * quantity)}</strong>
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <div>
              {product.compareAtInCents ? (
                <small>{money(product.compareAtInCents * quantity)}</small>
              ) : null}
              <strong>{money(product.priceInCents * quantity)}</strong>
            </div>
          </div>
        </aside>
      </div>
      <footer className="checkout-powered">
        Checkout seguro por <strong>CheckoutV3</strong>
      </footer>
    </article>
  );
}
