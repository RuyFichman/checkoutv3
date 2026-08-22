import type { ReactNode } from 'react';

export const brandTokens = {
  background: '#07060d',
  surface: '#11101a',
  border: '#262336',
  text: '#f7f5ff',
  muted: '#918ca5',
  primary: '#7c3aed',
  primaryBright: '#9b6cff',
} as const;

type SurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function Surface({ children, className = '' }: SurfaceProps) {
  return <section className={`surface ${className}`.trim()}>{children}</section>;
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success';
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
