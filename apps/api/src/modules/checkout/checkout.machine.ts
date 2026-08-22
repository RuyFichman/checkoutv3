import type { CheckoutSessionStatus } from '@checkout/contracts';

const allowedTransitions: Record<CheckoutSessionStatus, CheckoutSessionStatus[]> = {
  OPEN: ['IDENTIFIED', 'EXPIRED', 'ABANDONED'],
  IDENTIFIED: ['PAYMENT_PENDING', 'EXPIRED', 'ABANDONED'],
  PAYMENT_PENDING: ['PAID', 'EXPIRED'],
  PAID: [],
  EXPIRED: [],
  ABANDONED: [],
};

export function canTransitionCheckout(
  current: CheckoutSessionStatus,
  target: CheckoutSessionStatus,
) {
  return current === target || allowedTransitions[current].includes(target);
}

export function calculateCheckoutTotals(
  unitPriceInCents: number,
  requestedQuantity: number,
  quantityEnabled: boolean,
) {
  if (!Number.isSafeInteger(unitPriceInCents) || unitPriceInCents <= 0) {
    throw new Error('O preço unitário deve ser um inteiro positivo em centavos.');
  }

  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 10) {
    throw new Error('A quantidade deve estar entre 1 e 10.');
  }

  const quantity = quantityEnabled ? requestedQuantity : 1;
  const subtotalInCents = unitPriceInCents * quantity;

  if (!Number.isSafeInteger(subtotalInCents)) {
    throw new Error('O total calculado excede o limite monetário suportado.');
  }

  return {
    quantity,
    subtotalInCents,
    totalInCents: subtotalInCents,
  };
}

export function buildMockPixCode(input: {
  amountInCents: number;
  externalId: string;
  orderPublicId: string;
}) {
  return [
    'PIX-SIMULADO',
    'CHECKOUTV3',
    input.orderPublicId,
    input.externalId,
    input.amountInCents.toString(),
    'SEM-VALOR-FINANCEIRO',
  ].join('|');
}
