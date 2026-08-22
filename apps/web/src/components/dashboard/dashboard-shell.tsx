'use client';

import type { AuthViewer } from '@checkout/contracts';
import {
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Palette,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
  Truck,
  Users,
  Webhook,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

interface DashboardShellProps {
  children: ReactNode;
  viewer: AuthViewer;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navigation: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Visão geral',
    items: [{ href: '/app', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operação',
    items: [
      { href: '/app/produtos', label: 'Produtos', icon: Package },
      { href: '/app/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { href: '/app/temas', label: 'Temas', icon: Palette },
      { href: '/app/order-bumps', label: 'Order bumps', icon: Boxes },
      { href: '/app/fretes', label: 'Fretes', icon: Truck },
    ],
  },
  {
    label: 'Conversão',
    items: [
      { href: '/app/pixels', label: 'Pixels e tracking', icon: Target },
      { href: '/app/gateways', label: 'Gateways', icon: CreditCard },
      { href: '/app/dominios', label: 'Domínios', icon: Globe2 },
      { href: '/app/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/app/notificacoes', label: 'Notificações', icon: Bell },
    ],
  },
  {
    label: 'Conta e crescimento',
    items: [
      { href: '/app/cobranca', label: 'Cobrança', icon: ReceiptText },
      { href: '/app/indicacoes', label: 'Indicações', icon: Users },
      { href: '/app/premios', label: 'Premiações', icon: Trophy },
      { href: '/app/suporte', label: 'Suporte', icon: CircleHelp },
      { href: '/app/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function DashboardShell({ children, viewer }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const currentItem = navigation
    .flatMap((group) => group.items)
    .find((item) => item.href === pathname);

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/backend/auth/logout', { method: 'POST' });
    router.push('/entrar');
    router.refresh();
  }

  const sidebar = (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar__top">
        <Link className="product-brand product-brand--compact" href="/app">
          <span className="product-brand__mark">C3</span>
          <span>CheckoutV3</span>
        </Link>
        <button className="sidebar-close" type="button" onClick={() => setMenuOpen(false)}>
          <X size={20} />
          <span className="sr-only">Fechar menu</span>
        </button>
      </div>

      <button className="workspace-switcher" type="button">
        <span className="workspace-switcher__avatar">{initials(viewer.workspace.name)}</span>
        <span>
          <strong>{viewer.workspace.name}</strong>
          <small>{viewer.role === 'OWNER' ? 'Proprietário' : viewer.role}</small>
        </span>
        <ChevronDown size={15} />
      </button>

      <nav className="dashboard-nav" aria-label="Navegação principal">
        {navigation.map((group) => (
          <div className="dashboard-nav__group" key={group.label}>
            <span className="dashboard-nav__label">{group.label}</span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === pathname;
              return (
                <Link
                  className={active ? 'dashboard-nav__item is-active' : 'dashboard-nav__item'}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.label === 'Notificações' ? <i>2</i> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-progress">
        <span>
          <Sparkles size={15} /> Jornada do MVP
        </span>
        <strong>2 de 6 etapas</strong>
        <div>
          <i />
        </div>
        <small>Agora: acesso e painel</small>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-layout">
      <div className={menuOpen ? 'mobile-sidebar is-open' : 'mobile-sidebar'}>{sidebar}</div>
      {menuOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}
      <div className="desktop-sidebar">{sidebar}</div>

      <section className="dashboard-stage">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__title">
            <button className="menu-trigger" type="button" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
              <span className="sr-only">Abrir menu</span>
            </button>
            <span>{currentItem?.label ?? 'Dashboard'}</span>
          </div>
          <div className="dashboard-topbar__actions">
            <span className="live-visitors">
              <i /> 0 online
            </span>
            <button className="icon-button" type="button" aria-label="Notificações">
              <Bell size={18} />
              <i />
            </button>
            <div className="user-chip">
              <span>{initials(viewer.user.name)}</span>
              <div>
                <strong>{viewer.user.name}</strong>
                <small>{viewer.user.email}</small>
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={logout}
              disabled={loggingOut}
              aria-label="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
        <footer className="dashboard-footer">
          <span>
            <Zap size={14} /> CheckoutV3
          </span>
          <span>Ambiente seguro · sessão protegida</span>
        </footer>
      </section>
    </div>
  );
}
