'use client';

import type { AuthViewer } from '@checkout/contracts';
import { Check, LoaderCircle, LockKeyhole, ShieldCheck, UserRound, Warehouse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

interface SettingsPanelProps {
  auditEvents: AuditEvent[];
  viewer: AuthViewer;
}

const actionLabels: Record<string, string> = {
  'identity.account_created': 'Conta e workspace criados',
  'identity.session_started': 'Nova sessão iniciada',
  'identity.session_ended': 'Sessão encerrada',
  'identity.password_reset_requested': 'Recuperação de senha solicitada',
  'identity.password_reset_completed': 'Senha redefinida',
  'identity.profile_updated': 'Perfil atualizado',
  'identity.workspace_updated': 'Workspace atualizado',
};

async function update(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/backend/account/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? 'Não foi possível salvar.');
  }
}

export function SettingsPanel({ auditEvents, viewer }: SettingsPanelProps) {
  const router = useRouter();
  const [profileState, setProfileState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [workspaceState, setWorkspaceState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const canManageWorkspace = viewer.role === 'OWNER' || viewer.role === 'ADMIN';

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setProfileState('saving');
    const data = new FormData(event.currentTarget);

    try {
      await update('profile', {
        name: data.get('name'),
        phone: String(data.get('phone') ?? '').trim() || null,
        timezone: data.get('timezone'),
      });
      setProfileState('saved');
      router.refresh();
      setTimeout(() => setProfileState('idle'), 1800);
    } catch (caught) {
      setProfileState('idle');
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
    }
  }

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setWorkspaceState('saving');
    const data = new FormData(event.currentTarget);

    try {
      await update('workspace', { name: data.get('workspaceName') });
      setWorkspaceState('saved');
      router.refresh();
      setTimeout(() => setWorkspaceState('idle'), 1800);
    } catch (caught) {
      setWorkspaceState('idle');
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">CONTA E WORKSPACE</span>
          <h1>Configurações</h1>
          <p>Atualize seu perfil e os dados visíveis do workspace.</p>
        </div>
        <span className="security-chip">
          <ShieldCheck size={16} /> Sessão protegida
        </span>
      </header>

      {error ? (
        <div className="form-message form-message--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="settings-grid">
        <form className="panel settings-card" onSubmit={saveProfile}>
          <header className="settings-card__header">
            <span className="settings-card__icon">
              <UserRound size={19} />
            </span>
            <div>
              <strong>Perfil do vendedor</strong>
              <p>Informações usadas na sua conta e nos registros de auditoria.</p>
            </div>
          </header>
          <div className="settings-card__body">
            <label className="form-field">
              <span>Nome</span>
              <input
                name="name"
                defaultValue={viewer.user.name}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label className="form-field">
              <span>E-mail</span>
              <input value={viewer.user.email} disabled />
              <small>O e-mail de acesso não pode ser alterado nesta fase.</small>
            </label>
            <div className="field-grid">
              <label className="form-field">
                <span>Telefone</span>
                <input
                  name="phone"
                  defaultValue={viewer.user.phone ?? ''}
                  placeholder="(11) 99999-9999"
                  maxLength={30}
                />
              </label>
              <label className="form-field">
                <span>Fuso horário</span>
                <select name="timezone" defaultValue={viewer.user.timezone}>
                  <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
                  <option value="America/Manaus">Manaus (UTC-4)</option>
                  <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
                </select>
              </label>
            </div>
          </div>
          <footer className="settings-card__footer">
            <button
              className="button button--primary"
              type="submit"
              disabled={profileState === 'saving'}
            >
              {profileState === 'saving' ? <LoaderCircle className="spin" size={16} /> : null}
              {profileState === 'saved' ? <Check size={16} /> : null}
              {profileState === 'saved' ? 'Perfil salvo' : 'Salvar perfil'}
            </button>
          </footer>
        </form>

        <form className="panel settings-card" onSubmit={saveWorkspace}>
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--blue">
              <Warehouse size={19} />
            </span>
            <div>
              <strong>Workspace</strong>
              <p>O tenant que isola produtos, pedidos, credenciais e métricas.</p>
            </div>
          </header>
          <div className="settings-card__body">
            <label className="form-field">
              <span>Nome do negócio</span>
              <input
                name="workspaceName"
                defaultValue={viewer.workspace.name}
                minLength={2}
                maxLength={120}
                required
                disabled={!canManageWorkspace}
              />
            </label>
            <label className="form-field">
              <span>Identificador</span>
              <input value={viewer.workspace.slug} disabled />
              <small>Usado internamente para garantir URLs estáveis.</small>
            </label>
            <div className="role-card">
              <LockKeyhole size={17} />
              <span>
                <strong>{viewer.role}</strong>
                <small>
                  {canManageWorkspace
                    ? 'Você pode editar as informações do workspace.'
                    : 'Somente proprietários e administradores podem editar.'}
                </small>
              </span>
            </div>
          </div>
          <footer className="settings-card__footer">
            <button
              className="button button--primary"
              type="submit"
              disabled={!canManageWorkspace || workspaceState === 'saving'}
            >
              {workspaceState === 'saving' ? <LoaderCircle className="spin" size={16} /> : null}
              {workspaceState === 'saved' ? <Check size={16} /> : null}
              {workspaceState === 'saved' ? 'Workspace salvo' : 'Salvar workspace'}
            </button>
          </footer>
        </form>
      </div>

      <section className="panel audit-panel">
        <header className="panel__header">
          <div>
            <span>Segurança</span>
            <strong>Atividade recente</strong>
          </div>
          <span className="period-chip">Últimos 12 eventos</span>
        </header>
        <div className="audit-list">
          {auditEvents.length ? (
            auditEvents.map((event) => (
              <div className="audit-row" key={event.id}>
                <span className="audit-row__dot" />
                <div>
                  <strong>{actionLabels[event.action] ?? event.action}</strong>
                  <small>{event.entityType}</small>
                </div>
                <time dateTime={event.createdAt}>
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(event.createdAt))}
                </time>
              </div>
            ))
          ) : (
            <p className="audit-empty">Os eventos de segurança deste workspace aparecerão aqui.</p>
          )}
        </div>
      </section>
    </div>
  );
}
