import { z } from 'zod';

export const idSchema = z.string().min(1);
export const currencySchema = z.enum(['BRL']);
export const moneyInCentsSchema = z.number().int().nonnegative().safe();

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().trim().min(2).max(120),
});

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80),
});

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const productTypeSchema = z.enum(['DIGITAL', 'PHYSICAL']);

export const productSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  themeId: idSchema.nullable(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120),
  description: z.string().max(2_000).nullable(),
  type: productTypeSchema,
  status: productStatusSchema,
  priceInCents: moneyInCentsSchema,
  currency: currencySchema,
});

export const checkoutThemeSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().trim().min(2).max(120),
  layout: z.enum(['CLASSIC', 'SIDE_SUMMARY', 'MINIMAL', 'SHOP', 'PIX_API']),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const checkoutSessionStatusSchema = z.enum([
  'OPEN',
  'IDENTIFIED',
  'PAYMENT_PENDING',
  'PAID',
  'EXPIRED',
  'ABANDONED',
]);

export const orderStatusSchema = z.enum([
  'PENDING',
  'PIX_CREATED',
  'PAID',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
]);

export const paymentStatusSchema = z.enum([
  'CREATED',
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
]);

export const checkoutEventTypeSchema = z.enum([
  'CHECKOUT_ACCESSED',
  'IDENTIFICATION_SUBMITTED',
  'DELIVERY_SUBMITTED',
  'PAYMENT_STARTED',
  'PIX_CREATED',
  'PIX_COPIED',
  'PAYMENT_CONFIRMED',
  'CHECKOUT_EXPIRED',
]);

export type CheckoutEventType = z.infer<typeof checkoutEventTypeSchema>;
export type CheckoutSessionStatus = z.infer<typeof checkoutSessionStatusSchema>;
export type CheckoutTheme = z.infer<typeof checkoutThemeSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type User = z.infer<typeof userSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
