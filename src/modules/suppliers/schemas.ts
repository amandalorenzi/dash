import { z } from 'zod';

const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const optionalCnpj = z.string().trim().optional().refine(
  (v) => !v || cnpjPattern.test(v),
  { message: 'CNPJ inválido. Use o formato 00.000.000/0000-00 (ou deixe em branco).' },
).transform((v) => v ?? '');

export const addressSchema = z.object({
  logradouro: z.string().default(''),
  numero: z.string().default(''),
  complemento: z.string().optional(),
  bairro: z.string().default(''),
  cidade: z.string().min(1, 'Informe a cidade.'),
  estado: z.string().length(2, 'Use a sigla do estado (ex: SP).'),
  cep: z.string().default(''),
});

export const responsavelSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do responsável.'),
  cargo: z.string().optional(),
  email: z.string().email('E-mail do responsável inválido.'),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
});

/**
 * Campos que o próprio expositor pode editar pelo portal (subconjunto do
 * cadastro completo — dados sensíveis como código interno e categoria
 * ficam restritos ao admin).
 */
export const supplierSelfEditSchema = z.object({
  razaoSocial: z.string().min(2, 'Informe a razão social.'),
  nomeFantasia: z.string().min(2, 'Informe o nome fantasia.'),
  cnpj: optionalCnpj,
  inscricaoEstadual: z.string().optional(),
  endereco: addressSchema,
  responsavel: responsavelSchema,
  standMetragem: z.coerce.number().min(0).optional(),
});
export type SupplierSelfEditInput = z.infer<typeof supplierSelfEditSchema>;

/** Formulário completo usado pelo admin (inclui campos internos). */
export const supplierAdminSchema = supplierSelfEditSchema.extend({
  standNumero: z.string().min(1, 'Informe o número do stand.'),
  standLocalizacao: z.string().optional(),
  categoria: z.string().optional().transform((v) => v ?? ''),
  observacoesInternas: z.string().optional(),
});
export type SupplierAdminInput = z.infer<typeof supplierAdminSchema>;
