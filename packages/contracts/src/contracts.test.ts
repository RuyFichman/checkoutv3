import { describe, expect, it } from 'vitest';

import { moneyInCentsSchema, productSchema } from './index';

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
});
