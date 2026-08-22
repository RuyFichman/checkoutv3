import { describe, expect, it } from 'vitest';

import { authViewerSchema, moneyInCentsSchema, productSchema, registerInputSchema } from './index';

describe('core contracts', () => {
  it('accepts integer monetary values in cents', () => {
    expect(moneyInCentsSchema.parse(9_990)).toBe(9_990);
  });

  it('rejects fractional monetary values', () => {
    expect(() => moneyInCentsSchema.parse(99.9)).toThrow();
  });

  it('validates the initial digital product contract', () => {
    expect(
      productSchema.parse({
        id: 'product_01',
        workspaceId: 'workspace_01',
        themeId: null,
        name: 'Curso de performance',
        slug: 'curso-de-performance',
        description: null,
        type: 'DIGITAL',
        status: 'DRAFT',
        priceInCents: 19_900,
        currency: 'BRL',
      }),
    ).toMatchObject({ status: 'DRAFT', priceInCents: 19_900 });
  });

  it('normalizes registration email and rejects weak passwords', () => {
    const valid = registerInputSchema.parse({
      name: 'Ruy Fichman',
      email: '  RUY@EXAMPLE.COM ',
      password: 'checkout123',
      workspaceName: 'Ruy Digital',
    });

    expect(valid.email).toBe('ruy@example.com');
    expect(
      registerInputSchema.safeParse({
        name: 'Ruy Fichman',
        email: 'ruy@example.com',
        password: 'somenteletras',
        workspaceName: 'Ruy Digital',
      }).success,
    ).toBe(false);
  });

  it('exposes only the safe authenticated viewer shape', () => {
    const result = authViewerSchema.safeParse({
      user: {
        id: 'user_1',
        email: 'ruy@example.com',
        name: 'Ruy Fichman',
        phone: null,
        timezone: 'America/Sao_Paulo',
      },
      workspace: {
        id: 'workspace_1',
        name: 'Ruy Digital',
        slug: 'ruy-digital',
      },
      role: 'OWNER',
      sessionExpiresAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });
});
