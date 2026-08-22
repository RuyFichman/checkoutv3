'use client';

import type { CatalogTheme, CheckoutThemeInput } from '@checkout/contracts';
import {
  Check,
  ImagePlus,
  Laptop,
  LoaderCircle,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { CheckoutPreview } from './checkout-preview';

interface ThemesPanelProps {
  initialThemes: CatalogTheme[];
  workspaceName: string;
}

const defaultTheme = (workspaceName: string): CheckoutThemeInput => ({
  name: 'Tema principal',
  storeName: workspaceName,
  layout: 'CLASSIC',
  logoUrl: null,
  bannerUrl: null,
  primaryColor: '#7C3AED',
  buttonColor: '#16A34A',
  backgroundColor: '#F5F3FF',
  textColor: '#17121F',
  settings: {
    gradientEnabled: true,
    secondaryColor: '#4C1D95',
    showTimer: true,
    timerMinutes: 15,
    showSecurityBadge: true,
    requireCpf: false,
    headline: 'Finalize seu pedido',
    supportText: 'Ambiente seguro para concluir sua compra.',
  },
});

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

export function ThemesPanel({ initialThemes, workspaceName }: ThemesPanelProps) {
  const [themes, setThemes] = useState(initialThemes);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CheckoutThemeInput>(() => defaultTheme(workspaceName));
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function openNew() {
    setEditingId(null);
    setDraft(defaultTheme(workspaceName));
    setError('');
    setMessage('');
    setDrawerOpen(true);
  }

  function openEdit(theme: CatalogTheme) {
    setEditingId(theme.id);
    setDraft({
      name: theme.name,
      storeName: theme.storeName,
      layout: 'CLASSIC',
      logoUrl: theme.logoUrl,
      bannerUrl: theme.bannerUrl,
      primaryColor: theme.primaryColor,
      buttonColor: theme.buttonColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      settings: theme.settings,
    });
    setError('');
    setMessage('');
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await request<{ theme: Omit<CatalogTheme, 'productCount'> }>(
        editingId ? `themes/${editingId}` : 'themes',
        editingId ? 'PATCH' : 'POST',
        draft,
      );
      const existing = themes.find((theme) => theme.id === result.theme.id);
      const theme: CatalogTheme = { ...result.theme, productCount: existing?.productCount ?? 0 };
      setThemes((current) => [theme, ...current.filter((item) => item.id !== theme.id)]);
      setEditingId(theme.id);
      setMessage('Tema salvo e pronto para vincular a produtos.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o tema.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(theme: CatalogTheme) {
    if (!window.confirm(`Excluir o tema “${theme.name}”?`)) return;
    setError('');
    try {
      await request(`themes/${theme.id}`, 'DELETE');
      setThemes((current) => current.filter((item) => item.id !== theme.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o tema.');
    }
  }

  async function loadAsset(kind: 'logoUrl' | 'bannerUrl', file?: File) {
    if (!file) return;
    try {
      const source = await readImage(file);
      setDraft((current) => ({ ...current, [kind]: source }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Imagem inválida.');
    }
  }

  return (
    <div className="dashboard-page catalog-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">EXPERIÊNCIA DE CHECKOUT</span>
          <h1>Temas</h1>
          <p>Configure a identidade visual e veja cada mudança antes de publicar.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openNew}>
          <Plus size={17} /> Criar tema
        </button>
      </header>

      {error ? (
        <div className="form-message form-message--error" role="alert">
          {error}
        </div>
      ) : null}

      {themes.length ? (
        <div className="theme-grid">
          {themes.map((theme) => (
            <article className="theme-card panel" key={theme.id}>
              <div className="theme-card__preview" style={{ background: theme.backgroundColor }}>
                <span
                  className="theme-card__brand"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.settings.secondaryColor})`,
                  }}
                >
                  {theme.logoUrl ? (
                    <i style={{ backgroundImage: `url(${theme.logoUrl})` }} />
                  ) : (
                    <i>{theme.storeName.slice(0, 2)}</i>
                  )}
                  <strong>{theme.storeName}</strong>
                </span>
                <span className="theme-card__form">
                  <i />
                  <i />
                  <button style={{ background: theme.buttonColor }} />
                </span>
              </div>
              <div className="theme-card__body">
                <div>
                  <span>LAYOUT CLÁSSICO</span>
                  <h2>{theme.name}</h2>
                  <p>
                    {theme.productCount}{' '}
                    {theme.productCount === 1 ? 'produto vinculado' : 'produtos vinculados'}
                  </p>
                </div>
                <div className="theme-swatches">
                  <i style={{ background: theme.primaryColor }} />
                  <i style={{ background: theme.buttonColor }} />
                  <i style={{ background: theme.backgroundColor }} />
                </div>
              </div>
              <footer>
                <button type="button" onClick={() => openEdit(theme)}>
                  <Pencil size={15} /> Personalizar
                </button>
                <button
                  className="is-danger"
                  type="button"
                  onClick={() => remove(theme)}
                  aria-label={`Excluir ${theme.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <section className="module-empty panel">
          <div className="module-empty__icon">
            <Palette size={27} />
          </div>
          <span className="planned-badge">
            <Check size={14} /> Editor disponível
          </span>
          <h2>Crie a aparência do seu checkout</h2>
          <p>Escolha cores, envie sua marca e configure os elementos de conversão.</p>
          <button className="button button--primary" type="button" onClick={openNew}>
            Criar primeiro tema
          </button>
        </section>
      )}

      {drawerOpen ? (
        <div
          className="catalog-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-dialog-title"
        >
          <button
            className="catalog-dialog__backdrop"
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar editor"
          />
          <section className="catalog-drawer catalog-drawer--theme">
            <header className="catalog-drawer__header">
              <div>
                <span>EDITOR VISUAL</span>
                <h2 id="theme-dialog-title">{editingId ? 'Personalizar tema' : 'Novo tema'}</h2>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </header>
            <div className="theme-editor">
              <div className="theme-editor__controls">
                <section>
                  <div className="control-section__title">
                    <i>1</i>
                    <span>
                      <strong>Identidade</strong>
                      <small>Nome e ativos da sua marca</small>
                    </span>
                  </div>
                  <label className="form-field">
                    <span>Nome interno do tema</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Nome exibido no checkout</span>
                    <input
                      value={draft.storeName}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, storeName: event.target.value }))
                      }
                    />
                  </label>
                  <div className="asset-grid">
                    <label className="mini-upload">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => loadAsset('logoUrl', event.target.files?.[0])}
                      />
                      <span>
                        {draft.logoUrl ? (
                          <i style={{ backgroundImage: `url(${draft.logoUrl})` }} />
                        ) : (
                          <ImagePlus size={20} />
                        )}
                        <strong>Logo</strong>
                        <small>Quadrada · até 1 MB</small>
                      </span>
                    </label>
                    <label className="mini-upload">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => loadAsset('bannerUrl', event.target.files?.[0])}
                      />
                      <span>
                        {draft.bannerUrl ? (
                          <i style={{ backgroundImage: `url(${draft.bannerUrl})` }} />
                        ) : (
                          <ImagePlus size={20} />
                        )}
                        <strong>Banner</strong>
                        <small>Horizontal · até 1 MB</small>
                      </span>
                    </label>
                  </div>
                </section>
                <section>
                  <div className="control-section__title">
                    <i>2</i>
                    <span>
                      <strong>Cores</strong>
                      <small>Paleta aplicada em tempo real</small>
                    </span>
                  </div>
                  <div className="color-grid">
                    {(
                      [
                        ['primaryColor', 'Principal'],
                        ['settings.secondaryColor', 'Secundária'],
                        ['buttonColor', 'Botão'],
                        ['backgroundColor', 'Fundo'],
                        ['textColor', 'Texto'],
                      ] as const
                    ).map(([key, label]) => {
                      const value =
                        key === 'settings.secondaryColor'
                          ? draft.settings.secondaryColor
                          : draft[key];
                      return (
                        <label className="color-field" key={key}>
                          <span>{label}</span>
                          <div>
                            <input
                              type="color"
                              value={value}
                              onChange={(event) =>
                                key === 'settings.secondaryColor'
                                  ? setDraft((current) => ({
                                      ...current,
                                      settings: {
                                        ...current.settings,
                                        secondaryColor: event.target.value,
                                      },
                                    }))
                                  : setDraft((current) => ({
                                      ...current,
                                      [key]: event.target.value,
                                    }))
                              }
                            />
                            <code>{value}</code>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <label className="switch-field">
                    <input
                      type="checkbox"
                      checked={draft.settings.gradientEnabled}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          settings: { ...current.settings, gradientEnabled: event.target.checked },
                        }))
                      }
                    />
                    <span>
                      <strong>Usar gradiente no cabeçalho</strong>
                      <small>Combina as cores principal e secundária.</small>
                    </span>
                  </label>
                </section>
                <section>
                  <div className="control-section__title">
                    <i>3</i>
                    <span>
                      <strong>Conteúdo e conversão</strong>
                      <small>Elementos do layout clássico</small>
                    </span>
                  </div>
                  <label className="form-field">
                    <span>Título principal</span>
                    <input
                      value={draft.settings.headline}
                      maxLength={100}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          settings: { ...current.settings, headline: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Texto de apoio</span>
                    <textarea
                      rows={3}
                      value={draft.settings.supportText}
                      maxLength={180}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          settings: { ...current.settings, supportText: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <div className="toggle-stack">
                    <label className="switch-field">
                      <input
                        type="checkbox"
                        checked={draft.settings.showTimer}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            settings: { ...current.settings, showTimer: event.target.checked },
                          }))
                        }
                      />
                      <span>
                        <strong>Timer de reserva</strong>
                        <small>Exibe urgência no topo do checkout.</small>
                      </span>
                    </label>
                    {draft.settings.showTimer ? (
                      <label className="form-field form-field--compact">
                        <span>Minutos</span>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={draft.settings.timerMinutes}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              settings: {
                                ...current.settings,
                                timerMinutes: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </label>
                    ) : null}
                    <label className="switch-field">
                      <input
                        type="checkbox"
                        checked={draft.settings.showSecurityBadge}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              showSecurityBadge: event.target.checked,
                            },
                          }))
                        }
                      />
                      <span>
                        <strong>Selo de segurança</strong>
                        <small>Reforça a proteção dos dados.</small>
                      </span>
                    </label>
                    <label className="switch-field">
                      <input
                        type="checkbox"
                        checked={draft.settings.requireCpf}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            settings: { ...current.settings, requireCpf: event.target.checked },
                          }))
                        }
                      />
                      <span>
                        <strong>Solicitar CPF</strong>
                        <small>Adiciona o documento aos dados do comprador.</small>
                      </span>
                    </label>
                  </div>
                </section>
              </div>
              <div className="theme-editor__preview">
                <header>
                  <div>
                    <span>PREVIEW AO VIVO</span>
                    <strong>Layout clássico</strong>
                  </div>
                  <div className="device-toggle">
                    <button
                      className={device === 'desktop' ? 'is-active' : ''}
                      type="button"
                      onClick={() => setDevice('desktop')}
                      aria-label="Preview desktop"
                    >
                      <Laptop size={16} />
                    </button>
                    <button
                      className={device === 'mobile' ? 'is-active' : ''}
                      type="button"
                      onClick={() => setDevice('mobile')}
                      aria-label="Preview mobile"
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>
                </header>
                <div className={`theme-preview-frame theme-preview-frame--${device}`}>
                  <CheckoutPreview
                    theme={draft}
                    product={{
                      name: 'Produto de demonstração',
                      description: 'Uma oferta clara, segura e pronta para converter.',
                      imageUrl: null,
                      priceInCents: 9700,
                      compareAtInCents: 14700,
                      quantityEnabled: true,
                    }}
                  />
                </div>
                <span className="preview-security">
                  <ShieldCheck size={14} /> Preview isolado · nenhum pedido será criado
                </span>
              </div>
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
                  <span>As alterações aparecem no preview em tempo real.</span>
                )}
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={save}
                disabled={saving}
              >
                {saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Salvar
                tema
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
