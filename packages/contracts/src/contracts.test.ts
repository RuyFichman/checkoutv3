import { describe, expect, it } from 'vitest';

import {
  authViewerSchema,
  checkoutIdentificationInputSchema,
  checkoutQuantityInputSchema,
  checkoutReceiptInputSchema,
  checkoutThemeInputSchema,
  moneyInCentsSchema,
  productInputSchema,
  productSchema,
  publicCheckoutSessionCreateInputSchema,
  publicSlugSchema,
  registerInputSchema,
} from './index';

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
        imageUrl: null,
        type: 'DIGITAL',
        status: 'DRAFT',
        priceInCents: 19_900,
        compareAtInCents: null,
        currency: 'BRL',
        quantityEnabled: false,
        deliveryConfig: null,
        redirectUrl: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  it('normalizes public slugs and validates product pricing', () => {
    expect(publicSlugSchema.parse('  Curso-Completo  ')).toBe('curso-completo');
    expect(
      productInputSchema.safeParse({
        name: 'Curso completo',
        slug: 'curso-completo',
        description: null,
        imageUrl: null,
        type: 'DIGITAL',
        priceInCents: 9_900,
        compareAtInCents: 8_900,
        quantityEnabled: false,
        deliveryConfig: { emailSubject: 'Seu acesso', emailMessage: 'Acesse seu conteúdo.' },
        redirectUrl: null,
        themeId: null,
      }).success,
    ).toBe(false);
  });

  it('accepts the first configurable checkout theme', () => {
    expect(
      checkoutThemeInputSchema.parse({
        name: 'Tema principal',
        storeName: 'Aurora Digital',
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
      }).layout,
    ).toBe('CLASSIC');
  });

  it('validates the public checkout session and normalizes the CPF', () => {
    expect(
      publicCheckoutSessionCreateInputSchema.parse({
        visitorId: 'b3d70a7e-347d-4fd4-98ea-f18ecb28f6e7',
        tracking: {
          source: 'newsletter',
          medium: null,
          campaign: null,
          content: null,
          term: null,
          referrer: null,
        },
      }).visitorId,
    ).toBe('b3d70a7e-347d-4fd4-98ea-f18ecb28f6e7');

    expect(
      checkoutIdentificationInputSchema.parse({
        name: 'Comprador Teste',
        email: 'COMPRADOR@EXAMPLE.COM',
        document: '123.456.789-01',
      }),
    ).toMatchObject({ email: 'comprador@example.com', document: '12345678901' });
    expect(checkoutQuantityInputSchema.safeParse({ quantity: 11 }).success).toBe(false);
  });

  it('accepts only bounded receipt data matching its declared type', () => {
    const dataUrl = `data:image/png;base64,${Buffer.from('mock-receipt').toString('base64')}`;
    expect(
      checkoutReceiptInputSchema.parse({
        dataUrl,
        fileName: 'comprovante.png',
        contentType: 'image/png',
        size: 12,
      }).fileName,
    ).toBe('comprovante.png');
    expect(
      checkoutReceiptInputSchema.safeParse({
        dataUrl,
        fileName: 'comprovante.pdf',
        contentType: 'application/pdf',
        size: 12,
      }).success,
    ).toBe(false);
  });
});
