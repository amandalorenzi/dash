import { z } from 'zod';

export const billingUnitEnum = z.enum(['UNIT', 'DAILY', 'HOURLY', 'METER', 'SQUARE_METER', 'POINT', 'PACKAGE', 'SERVICE']);

export const catalogItemSchema = z.object({
  code: z.string().min(1, 'Informe o código.').transform((v) => v.trim().toUpperCase()),
  name: z.string().min(2, 'Informe o nome do item.'),
  description: z.string().optional(),
  category: z.string().min(1, 'Selecione uma categoria.'),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero.'),
  billingUnit: billingUnitEnum,
  minQty: z.coerce.number().int().min(1).default(1),
  maxQty: z.coerce.number().int().min(1).default(10),
  requiresApproval: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

/** Linha crua de uma planilha de importação (antes de validar). */
export const importRowSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().min(1),
  price: z.coerce.number().min(0),
  billing_unit: billingUnitEnum,
  minimum_quantity: z.coerce.number().int().min(1).default(1),
  maximum_quantity: z.coerce.number().int().min(1).default(10),
  allows_quantity: z.coerce.boolean().default(true),
  requires_dash_approval: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});
export type ImportRow = z.infer<typeof importRowSchema>;
