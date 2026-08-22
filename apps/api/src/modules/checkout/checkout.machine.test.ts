import { describe, expect, it } from 'vitest';

import {
  buildMockPixCode,
  calculateCheckoutTotals,
  canTransitionCheckout,
} from './checkout.machine';

describe('checkout state machine', () => {
  it('calculates totals only with integer cents and allowed quantities', () => {
    expect(calculateCheckoutTotals(12_990, 3, true)).toEqual({
      quantity: 3,
      subtotalInCents: 38_970,
      totalInCents: 38_970,
    });
    expect(calculateCheckoutTotals(12_990, 3, false).quantity).toBe(1);
    expect(() => calculateCheckoutTotals(129.9, 1, true)).toThrow();
  });

  it('allows only the forward checkout lifecycle', () => {
    expect(canTransitionCheckout('OPEN', 'IDENTIFIED')).toBe(true);
    expect(canTransitionCheckout('IDENTIFIED', 'PAYMENT_PENDING')).toBe(true);
    expect(canTransitionCheckout('PAYMENT_PENDING', 'PAID')).toBe(true);
    expect(canTransitionCheckout('PAID', 'PAYMENT_PENDING')).toBe(false);
    expect(canTransitionCheckout('EXPIRED', 'IDENTIFIED')).toBe(false);
  });

  it('creates an unmistakably simulated PIX code', () => {
    const code = buildMockPixCode({
      amountInCents: 9_900,
      externalId: 'mock-charge',
      orderPublicId: 'C3-ORDER',
    });

    expect(code).toContain('PIX-SIMULADO');
    expect(code).toContain('SEM-VALOR-FINANCEIRO');
    expect(code).toContain('9900');
  });
});
