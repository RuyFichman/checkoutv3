'use client';

import type { CatalogProduct, CatalogTheme, ProductInput } from '@checkout/contracts';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Copy,
  ExternalLink,
  FilePenLine,
  ImagePlus,
  LoaderCircle,
  PackagePlus,
  Rocket,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CheckoutPreview } from './checkout-preview';

interface ProductsPanelProps {
  initialProducts: CatalogProduct[];
  themes: CatalogTheme[];
  workspaceSlug: string;
}

interface ProductDraft {
  compareAt: string;
  deliveryEmailMessage: string;
  deliveryEmailSubject: string;
  description: string;
  imageUrl: string | null;
  name: string;
  price: string;
  quantityEnabled: boolean;
  redirectUrl: string;
  slug: string;
  themeId: string;
}

const emptyDraft: ProductDraft = {
  compareAt: '',
  deliveryEmailMessage: 'Você receberá as instruções de acesso logo após a confirmação.',
  deliveryEmailSubject: 'Seu acesso está pronto',
  description: '',
  imageUrl: null,
  name: '',
  price: '97.00',
  quantityEnabled: false,
  redirectUrl: '',
  slug: '',
  themeId: '',
};

const statusLabels = { ACTIVE: 'Publicado', ARCHIVED: 'Arquivado', DRAFT: 'Rascunho' } as const;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function cents(value: string) {
  return Math.round(Number(value.replace(',', '.')) * 100);
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function fromProduct(product: CatalogProduct): ProductDraft {
  return {
    compareAt: product.compareAtInCents === null ? '' : String(product.compareAtInCents / 100),
    deliveryEmailMessage: product.deliveryConfig?.emailMessage ?? emptyDraft.deliveryEmailMessage,
    deliveryEmailSubject: product.deliveryConfig?.emailSubject ?? emptyDraft.deliveryEmailSubject,
    description: product.description ?? '',
    imageUrl: product.imageUrl,
    name: product.name,
    price: String(product.priceInCents / 100),
    quantityEnabled: product.quantityEnabled,
    redirectUrl: product.redirectUrl ?? '',
    slug: product.slug,
    themeId: product.themeId ?? '',
  };
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? 'Não foi possível concluir a operação.');
  return data;
}

async function readImage(file: File) {
  if (file.size > 1_000_000) throw new Error('Escolha uma imagem de até 1 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Use uma imagem PNG, JPEG ou WebP.');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export function ProductsPanel({ initialProducts, themes, workspaceSlug }: ProductsPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [filter, setFilter] = useState<'ALL' | CatalogProduct['status']>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const visibleProducts =
    filter === 'ALL' ? products : products.filter((item) => item.status === filter);
  const selectedTheme = themes.find((theme) => theme.id === draft.themeId);

  function openNew() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setStep(1);
    setError('');
    setMessage('');
    setDrawerOpen(true);
  }

  function openEdit(product: CatalogProduct) {
    setEditingId(product.id);
    setDraft(fromProduct(product));
    setStep(1);
    setError('');
    setMessage('');
    setDrawerOpen(true);
  }

  function upsert(product: CatalogProduct) {
    setProducts((current) => [product, ...current.filter((item) => item.id !== product.id)]);
  }

  function payload(): ProductInput {
    const priceInCents = cents(draft.price);
    const compareAtInCents = draft.compareAt ? cents(draft.compareAt) : null;
    if (draft.name.trim().length < 2 || draft.slug.length < 2) {
      throw new Error('Informe o nome e o slug do produto.');
    }
    if (!Number.isFinite(priceInCents) || priceInCents <= 0) {
      throw new Error('Informe um preço de venda maior que zero.');
    }
    return {
      name: draft.name.trim(),
      slug: draft.slug,
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl,
      type: 'DIGITAL',
      priceInCents,
      compareAtInCents,
      quantityEnabled: draft.quantityEnabled,
      deliveryConfig: {
        emailSubject: draft.deliveryEmailSubject.trim(),
        emailMessage: draft.deliveryEmailMessage.trim(),
      },
      redirectUrl: draft.redirectUrl.trim() || null,
      themeId: draft.themeId || null,
    };
  }

  async function save(publish: boolean) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (publish && !draft.themeId) throw new Error('Escolha um tema antes de publicar.');
      const result = await request<{ product: CatalogProduct }>(
        editingId ? `products/${editingId}` : 'products',
        editingId ? 'PATCH' : 'POST',
        payload(),
      );
      let product = result.product;
      if (publish) {
        product = (
          await request<{ product: CatalogProduct }>(`products/${product.id}/publish`, 'PATCH')
        ).product;
      }
      upsert(product);
      setEditingId(product.id);
      setMessage(publish ? 'Produto publicado e checkout liberado.' : 'Rascunho salvo.');
      if (publish) setDrawerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(product: CatalogProduct, action: 'archive' | 'restore') {
    setError('');
    try {
      const result = await request<{ product: CatalogProduct }>(
        `products/${product.id}/${action}`,
        'PATCH',
      );
      upsert(result.product);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o produto.');
    }
  }

  async function remove(product: CatalogProduct) {
    if (!window.confirm(`Excluir definitivamente “${product.name}”?`)) return;
    try {
      await request(`products/${product.id}`, 'DELETE');
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o produto.');
    }
  }

  return (
    <div className="dashboard-page catalog-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">CATÁLOGO DIGITAL</span>
          <h1>Produtos</h1>
          <p>Do rascunho à publicação, com entrega e checkout configurados.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openNew}>
          <PackagePlus size={17} /> Criar produto
        </button>
      </header>

      {error ? (
        <div className="form-message form-message--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="catalog-toolbar panel">
        <div className="catalog-tabs" aria-label="Filtrar produtos">
          {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((status) => (
            <button
              className={filter === status ? 'is-active' : ''}
              type="button"
              key={status}
              onClick={() => setFilter(status)}
            >
              {status === 'ALL' ? 'Todos' : statusLabels[status]}
              <span>
                {status === 'ALL'
                  ? products.length
                  : products.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visibleProducts.length ? (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card panel" key={product.id}>
              <div className="product-card__visual">
                {product.imageUrl ? (
                  <span
                    style={{ backgroundImage: `url(${product.imageUrl})` }}
                    role="img"
                    aria-label={product.name}
                  />
                ) : (
                  <Box size={28} />
                )}
                <i className={`status-pill status-pill--${product.status.toLowerCase()}`}>
                  {statusLabels[product.status]}
                </i>
              </div>
              <div className="product-card__body">
                <div>
                  <span>PRODUTO DIGITAL</span>
                  <h2>{product.name}</h2>
                  <p>/{product.slug}</p>
                </div>
                <strong>{money(product.priceInCents)}</strong>
                <small>{product.theme?.name ?? 'Tema não selecionado'}</small>
              </div>
              <footer className="product-card__actions">
                <button type="button" onClick={() => openEdit(product)}>
                  <FilePenLine size={15} /> Editar
                </button>
                {product.status === 'ACTIVE' ? (
                  <Link href={`/c/${workspaceSlug}/${product.slug}`} target="_blank">
                    <ExternalLink size={15} /> Abrir checkout
                  </Link>
                ) : null}
                {product.status === 'ARCHIVED' ? (
                  <button type="button" onClick={() => changeStatus(product, 'restore')}>
                    <Copy size={15} /> Restaurar
                  </button>
                ) : (
                  <button type="button" onClick={() => changeStatus(product, 'archive')}>
                    <Archive size={15} /> Arquivar
                  </button>
                )}
                {product.status !== 'ACTIVE' ? (
                  <button className="is-danger" type="button" onClick={() => remove(product)}>
                    <Trash2 size={15} />
                    <span className="sr-only">Excluir {product.name}</span>
                  </button>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <section className="module-empty panel">
          <div className="module-empty__icon">
            <PackagePlus size={27} />
          </div>
          <span className="planned-badge">
            <Check size={14} /> Sprint 2 disponível
          </span>
          <h2>
            {products.length ? 'Nenhum produto neste filtro' : 'Seu primeiro produto começa aqui'}
          </h2>
          <p>Crie um rascunho, conecte um tema e publique uma URL própria.</p>
          <button className="button button--primary" type="button" onClick={openNew}>
            Criar produto
          </button>
        </section>
      )}

      {drawerOpen ? (
        <div
          className="catalog-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-dialog-title"
        >
          <button
            className="catalog-dialog__backdrop"
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar assistente"
          />
          <section className="catalog-drawer catalog-drawer--wide">
            <header className="catalog-drawer__header">
              <div>
                <span>ASSISTENTE DE PRODUTO</span>
                <h2 id="product-dialog-title">
                  {editingId ? 'Editar produto' : 'Novo produto digital'}
                </h2>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </header>
            <div className="wizard-steps">
              {['Identidade', 'Oferta e entrega', 'Tema e publicação'].map((label, index) => (
                <button
                  type="button"
                  className={step === index + 1 ? 'is-active' : step > index + 1 ? 'is-done' : ''}
                  onClick={() => setStep(index + 1)}
                  key={label}
                >
                  <i>{step > index + 1 ? <Check size={13} /> : index + 1}</i>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="catalog-drawer__body">
              {step === 1 ? (
                <div className="wizard-panel">
                  <div className="wizard-panel__heading">
                    <span>ETAPA 1 DE 3</span>
                    <h3>O que você vai vender?</h3>
                    <p>Esses dados apresentam o produto no checkout.</p>
                  </div>
                  <label className="form-field">
                    <span>Nome do produto</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                          slug: editingId ? current.slug : slugify(event.target.value),
                        }))
                      }
                      placeholder="Ex.: Método Conversão Clara"
                      autoFocus
                    />
                  </label>
                  <label className="form-field">
                    <span>Slug público</span>
                    <div className="slug-field">
                      <span>/c/{workspaceSlug}/</span>
                      <input
                        value={draft.slug}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
                        }
                      />
                    </div>
                  </label>
                  <label className="form-field">
                    <span>Descrição</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={4}
                      maxLength={2000}
                      placeholder="Explique o resultado que o comprador receberá."
                    />
                  </label>
                  <label className="image-upload">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          const imageUrl = await readImage(file);
                          setDraft((current) => ({ ...current, imageUrl }));
                        } catch (caught) {
                          setError(caught instanceof Error ? caught.message : 'Imagem inválida.');
                        }
                      }}
                    />
                    <span>
                      {draft.imageUrl ? (
                        <i style={{ backgroundImage: `url(${draft.imageUrl})` }} />
                      ) : (
                        <ImagePlus size={24} />
                      )}
                      <strong>
                        {draft.imageUrl ? 'Trocar imagem' : 'Adicionar imagem do produto'}
                      </strong>
                      <small>PNG, JPEG ou WebP · até 1 MB</small>
                    </span>
                  </label>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="wizard-panel">
                  <div className="wizard-panel__heading">
                    <span>ETAPA 2 DE 3</span>
                    <h3>Oferta e entrega</h3>
                    <p>Defina preço, quantidade e a mensagem pós-compra.</p>
                  </div>
                  <div className="field-grid">
                    <label className="form-field">
                      <span>Preço de venda</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={draft.price}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, price: event.target.value }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Preço anterior</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={draft.compareAt}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, compareAt: event.target.value }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                  </div>
                  <label className="switch-field">
                    <input
                      type="checkbox"
                      checked={draft.quantityEnabled}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          quantityEnabled: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      <strong>Permitir quantidade</strong>
                      <small>O comprador poderá escolher mais de uma unidade.</small>
                    </span>
                  </label>
                  <label className="form-field">
                    <span>Assunto do e-mail de entrega</span>
                    <input
                      value={draft.deliveryEmailSubject}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          deliveryEmailSubject: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Mensagem de entrega</span>
                    <textarea
                      rows={4}
                      value={draft.deliveryEmailMessage}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          deliveryEmailMessage: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>URL de redirecionamento</span>
                    <input
                      type="url"
                      value={draft.redirectUrl}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, redirectUrl: event.target.value }))
                      }
                      placeholder="https://sua-area-de-membros.com"
                    />
                    <small>Opcional após o pagamento.</small>
                  </label>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="wizard-panel wizard-panel--preview">
                  <div className="wizard-panel__heading">
                    <span>ETAPA 3 DE 3</span>
                    <h3>Escolha a experiência</h3>
                    <p>O tema define como seu checkout será apresentado.</p>
                  </div>
                  {themes.length ? (
                    <div className="theme-choice-list">
                      {themes.map((theme) => (
                        <button
                          type="button"
                          className={draft.themeId === theme.id ? 'is-active' : ''}
                          onClick={() => setDraft((current) => ({ ...current, themeId: theme.id }))}
                          key={theme.id}
                        >
                          <i style={{ background: theme.primaryColor }} />
                          <span>
                            <strong>{theme.name}</strong>
                            <small>{theme.storeName}</small>
                          </span>
                          {draft.themeId === theme.id ? <Check size={17} /> : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="inline-empty">
                      <span>Nenhum tema criado.</span>
                      <Link href="/app/temas">
                        Criar tema primeiro <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                  {selectedTheme ? (
                    <div className="wizard-checkout-preview">
                      <CheckoutPreview
                        theme={selectedTheme}
                        product={{
                          name: draft.name || 'Seu produto digital',
                          description: draft.description || null,
                          imageUrl: draft.imageUrl,
                          priceInCents: cents(draft.price) || 9700,
                          compareAtInCents: draft.compareAt ? cents(draft.compareAt) : null,
                          quantityEnabled: draft.quantityEnabled,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <footer className="catalog-drawer__footer">
              <div>
                {error ? (
                  <span className="drawer-error" role="alert">
                    {error}
                  </span>
                ) : message ? (
                  <span className="drawer-success">
                    <Check size={14} /> {message}
                  </span>
                ) : (
                  <span>O rascunho fica salvo no seu workspace.</span>
                )}
              </div>
              <div>
                {step > 1 ? (
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft size={16} /> Voltar
                  </button>
                ) : null}
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => save(false)}
                  disabled={saving}
                >
                  {saving ? <LoaderCircle className="spin" size={16} /> : null}
                  {editingId ? 'Salvar alterações' : 'Salvar rascunho'}
                </button>
                {step < 3 ? (
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => setStep(step + 1)}
                  >
                    Continuar <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => save(true)}
                    disabled={saving || !draft.themeId}
                  >
                    <Rocket size={16} /> Publicar checkout
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
