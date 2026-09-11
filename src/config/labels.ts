import type {
  StatusCadastral, StatusDash, StatusFinanceiro, StatusGeral,
  OrderStatus, ApprovalStatus, BillingUnit, PaymentStatus, DocumentStatus, Role,
} from '@/types/domain';

export const STATUS_CADASTRAL_LABEL: Record<StatusCadastral, string> = {
  NOT_STARTED: 'Não iniciado',
  IN_PROGRESS: 'Em preenchimento',
  SUBMITTED: 'Enviado pelo expositor',
  NEEDS_CORRECTION: 'Correção solicitada',
  VERIFIED: 'Verificado pela DASH',
  VALIDATED: 'Validado',
};

export const STATUS_DASH_LABEL: Record<StatusDash, string> = {
  PENDING_REVIEW: 'Aguardando análise',
  UNDER_REVIEW: 'Em análise',
  VERIFIED: 'Verificado',
  VALIDATED: 'Validado',
  REJECTED: 'Rejeitado',
};

export const STATUS_FINANCEIRO_LABEL: Record<StatusFinanceiro, string> = {
  NO_CHARGE: 'Sem cobrança',
  PAYMENT_PENDING: 'Aguardando pagamento',
  PAYMENT_REPORTED: 'Pagamento informado',
  PAYMENT_UNDER_REVIEW: 'Em verificação',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  EXEMPT: 'Isento',
};

export const STATUS_GERAL_LABEL: Record<StatusGeral, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  REGULAR: 'Regular',
  COMPLETED: 'Concluído',
  INACTIVE: 'Inativo',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviado',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
};

export const BILLING_UNIT_LABEL: Record<BillingUnit, string> = {
  UNIT: 'unidade', DAILY: 'diária', HOURLY: 'hora', METER: 'metro',
  SQUARE_METER: 'm²', POINT: 'ponto', PACKAGE: 'pacote', SERVICE: 'serviço',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAYMENT_PENDING: 'Aguardando pagamento',
  PAYMENT_REPORTED: 'Pagamento informado',
  PAYMENT_UNDER_REVIEW: 'Em verificação',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  EXEMPT: 'Isento',
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING_REVIEW: 'Aguardando análise', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Administrador geral',
  PRODUCAO: 'Produção',
  FINANCEIRO: 'Financeiro',
  OPERACIONAL: 'Operacional',
  EXPOSITOR: 'Expositor',
};

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_MAP: Record<string, Tone> = {
  NOT_STARTED: 'neutral', IN_PROGRESS: 'warning', SUBMITTED: 'info', NEEDS_CORRECTION: 'danger', VERIFIED: 'info', VALIDATED: 'success',
  PENDING_REVIEW: 'warning', UNDER_REVIEW: 'info', REJECTED: 'danger',
  NO_CHARGE: 'neutral', PAYMENT_PENDING: 'warning', PAYMENT_REPORTED: 'info', PAYMENT_UNDER_REVIEW: 'info', PAID: 'success', OVERDUE: 'danger', EXEMPT: 'neutral',
  PENDING: 'warning', REGULAR: 'info', COMPLETED: 'success', INACTIVE: 'neutral',
  DRAFT: 'neutral', APPROVED: 'success', CANCELLED: 'neutral',
};

export function toneFor(value: string): Tone {
  return TONE_MAP[value] ?? 'neutral';
}
