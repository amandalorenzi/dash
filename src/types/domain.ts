/**
 * Tipos centrais do domínio DASH | Supplier Management.
 * Nomes técnicos em inglês; labels de interface ficam nos módulos de UI.
 */

export type Role = 'SUPER_ADMIN' | 'PRODUCAO' | 'FINANCEIRO' | 'OPERACIONAL' | 'EXPOSITOR';

export type StatusCadastral =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'NEEDS_CORRECTION' | 'VERIFIED' | 'VALIDATED';

export type StatusDash =
  | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'VERIFIED' | 'VALIDATED' | 'REJECTED';

export type StatusFinanceiro =
  | 'NO_CHARGE' | 'PAYMENT_PENDING' | 'PAYMENT_REPORTED' | 'PAYMENT_UNDER_REVIEW' | 'PAID' | 'OVERDUE' | 'EXEMPT';

export type StatusGeral = 'PENDING' | 'IN_PROGRESS' | 'REGULAR' | 'COMPLETED' | 'INACTIVE';

export type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BillingUnit = 'UNIT' | 'DAILY' | 'HOURLY' | 'METER' | 'SQUARE_METER' | 'POINT' | 'PACKAGE' | 'SERVICE';

export type PaymentStatus =
  | 'PAYMENT_PENDING' | 'PAYMENT_REPORTED' | 'PAYMENT_UNDER_REVIEW' | 'PAID' | 'OVERDUE' | 'EXEMPT';

export type DocumentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface FirestoreEvent {
  id: string;
  name: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  endereco?: Address;
  /** Prazo final para envio de solicitações de extras. */
  orderDeadline?: string | null;
  /** Conteúdo do "Manual do expositor" deste evento, editável pelo admin. */
  guideContent?: string;
  /** Documentos/links compartilhados pela DASH, visíveis ao expositor. */
  sharedDocuments?: { id: string; name: string; url: string }[];
  createdAt: string;
}

export interface EventUpdate {
  id: string;
  eventId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface Address {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Responsavel {
  nome: string;
  cargo?: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
}

/** Expositor (anteriormente "fornecedor" na spec original). */
export interface Supplier {
  id: string;
  eventId: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: Address;
  responsavel: Responsavel;
  nomeExibido: string;
  standNumero: string;
  standLocalizacao?: string;
  standMetragem?: number;
  categoria: string;
  observacoesInternas?: string;
  statusGeral: StatusGeral;
  statusCadastral: StatusCadastral;
  statusDash: StatusDash;
  statusFinanceiro: StatusFinanceiro;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  /** UID do usuário Firebase Auth vinculado ao portal deste expositor. */
  authUid?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  eventId: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  billingUnit: BillingUnit;
  minQty: number;
  maxQty: number;
  allowsQuantity: boolean;
  requiresApproval: boolean;
  availableAfterDeadline?: boolean;
  specificDeadline?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface OrderItem {
  id: string;
  catalogItemId: string;
  codeSnapshot: string;
  nameSnapshot: string;
  unitSnapshot: BillingUnit;
  unitPriceSnapshot: number;
  quantity: number;
  approvalStatus: ApprovalStatus;
  notes?: string;
}

export interface SupplierOrder {
  id: string;
  eventId: string;
  supplierId: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  eventId: string;
  supplierId: string;
  orderId?: string | null;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string;
  paidAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  eventId: string;
  supplierId: string;
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  tipoCredencial: string;
  createdAt: string;
}

export interface SupplierDocument {
  id: string;
  eventId: string;
  supplierId: string;
  nome: string;
  tipo: string;
  status: DocumentStatus;
  observacoes?: string;
  uploadedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface Deadline {
  id: string;
  eventId: string;
  titulo: string;
  descricao?: string;
  dataLimite: string;
}

export interface AuditLog {
  id: string;
  eventId: string;
  userName: string;
  entityType: string;
  entityId?: string;
  entityLabel: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  /** Preenchido apenas para role EXPOSITOR: vincula ao registro do expositor. */
  supplierId?: string | null;
  eventId?: string | null;
  /** true logo após criação/reset de senha pelo admin — força troca no próximo login. */
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface CatalogImport {
  id: string;
  eventId: string;
  filename: string;
  version: number;
  status: 'VALIDATING' | 'PREVIEWED' | 'APPLIED' | 'FAILED';
  recordsTotal: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsUnchanged: number;
  recordsFailed: number;
  createdBy: string;
  createdAt: string;
}
