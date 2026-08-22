import { z } from 'zod';

export const idSchema = z.string().min(1);
export const currencySchema = z.enum(['BRL']);
export const moneyInCentsSchema = z.number().int().nonnegative().safe();
export const membershipRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export const emailInputSchema = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'Inclua pelo menos uma letra.')
  .regex(/[0-9]/, 'Inclua pelo menos um número.');

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

export const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailInputSchema,
  password: passwordSchema,
  workspaceName: z.string().trim().min(2).max(120),
});

export const loginInputSchema = z.object({
  email: emailInputSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordInputSchema = z.object({
  email: emailInputSchema,
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});

export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).nullable(),
  timezone: z.string().trim().min(1).max(80),
});

export const updateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const authViewerSchema = z.object({
  user: userSchema.extend({
    phone: z.string().nullable(),
    timezone: z.string(),
  }),
  workspace: workspaceSchema,
  role: membershipRoleSchema,
  sessionExpiresAt: z.iso.datetime(),
});

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const productTypeSchema = z.enum(['DIGITAL', 'PHYSICAL']);
export const checkoutLayoutSchema = z.enum([
  'CLASSIC',
  'SIDE_SUMMARY',
  'MINIMAL',
  'SHOP',
  'PIX_API',
]);
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const publicSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.');
export const publicAssetSourceSchema = z
  .union([
    z.url(),
    z
      .string()
      .max(1_500_000, 'A imagem deve ter no máximo 1 MB.')
      .regex(/^data:image\/(?:png|jpeg|webp);base64,/, 'Use PNG, JPEG ou WebP.'),
  ])
  .nullable();

export const deliveryConfigSchema = z.object({
  emailSubject: z.string().trim().min(2).max(160),
  emailMessage: z.string().trim().min(2).max(2_000),
});

export const themeSettingsSchema = z.object({
  gradientEnabled: z.boolean(),
  secondaryColor: hexColorSchema,
  showTimer: z.boolean(),
  timerMinutes: z.number().int().min(5).max(60),
  showSecurityBadge: z.boolean(),
  requireCpf: z.boolean(),
  headline: z.string().trim().min(2).max(100),
  supportText: z.string().trim().min(2).max(180),
});

export const productSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  themeId: idSchema.nullable(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120),
  description: z.string().max(2_000).nullable(),
  imageUrl: publicAssetSourceSchema,
  type: productTypeSchema,
  status: productStatusSchema,
  priceInCents: moneyInCentsSchema,
  compareAtInCents: moneyInCentsSchema.nullable(),
  currency: currencySchema,
  quantityEnabled: z.boolean(),
  deliveryConfig: deliveryConfigSchema.nullable(),
  redirectUrl: z.url().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const checkoutThemeSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().trim().min(2).max(120),
  storeName: z.string().trim().min(2).max(120),
  layout: checkoutLayoutSchema,
  logoUrl: publicAssetSourceSchema,
  bannerUrl: publicAssetSourceSchema,
  primaryColor: hexColorSchema,
  buttonColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
  settings: themeSettingsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const catalogProductSchema = productSchema.extend({
  theme: z
    .object({
      id: idSchema,
      name: z.string(),
    })
    .nullable(),
});

export const catalogThemeSchema = checkoutThemeSchema.extend({
  productCount: z.number().int().nonnegative(),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: publicSlugSchema,
    description: z.string().trim().max(2_000).nullable(),
    imageUrl: publicAssetSourceSchema,
    type: z.literal('DIGITAL'),
    priceInCents: moneyInCentsSchema,
    compareAtInCents: moneyInCentsSchema.nullable(),
    quantityEnabled: z.boolean(),
    deliveryConfig: deliveryConfigSchema,
    redirectUrl: z.url().nullable(),
    themeId: idSchema.nullable(),
  })
  .superRefine((input, context) => {
    if (input.compareAtInCents !== null && input.compareAtInCents <= input.priceInCents) {
      context.addIssue({
        code: 'custom',
        path: ['compareAtInCents'],
        message: 'O preço anterior deve ser maior que o preço de venda.',
      });
    }
  });

export const checkoutThemeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  storeName: z.string().trim().min(2).max(120),
  layout: z.literal('CLASSIC'),
  logoUrl: publicAssetSourceSchema,
  bannerUrl: publicAssetSourceSchema,
  primaryColor: hexColorSchema,
  buttonColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
  settings: themeSettingsSchema,
});

export const publicCheckoutSchema = z.object({
  workspace: workspaceSchema,
  product: productSchema,
  theme: checkoutThemeSchema,
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
export type CheckoutThemeInput = z.infer<typeof checkoutThemeInputSchema>;
export type CatalogProduct = z.infer<typeof catalogProductSchema>;
export type CatalogTheme = z.infer<typeof catalogThemeSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type DeliveryConfig = z.infer<typeof deliveryConfigSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type PublicCheckout = z.infer<typeof publicCheckoutSchema>;
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type User = z.infer<typeof userSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type AuthViewer = z.infer<typeof authViewerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>;
