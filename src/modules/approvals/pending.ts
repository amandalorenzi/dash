import type { Supplier, SupplierOrder, Payment, TeamMember, SupplierDocument } from '@/types/domain';

/**
 * Contagens de "o que precisa de ação da DASH". Centralizado aqui para a
 * sidebar, a listagem e as abas do expositor mostrarem sempre o mesmo número.
 */
export interface SupplierPendingCounts {
  cadastro: number;
  extras: number;
  equipe: number;
  documentos: number;
  pagamentos: number;
  total: number;
}

export function countSupplierPendings(
  supplier: Supplier,
  orders: SupplierOrder[],
  payments: Payment[],
  team: TeamMember[],
  documents: SupplierDocument[],
): SupplierPendingCounts {
  // Cadastro conta como 1 pendência quando aguarda análise/validação da DASH.
  const cadastro = ['SUBMITTED'].includes(supplier.statusCadastral)
    || ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(supplier.statusDash) ? 1 : 0;

  const extras = orders.flatMap((o) => o.items).filter((i) => i.approvalStatus === 'PENDING').length;
  const equipe = team.filter((m) => (m.status ?? 'PENDING') === 'PENDING').length;
  const documentos = documents.filter((d) => d.status === 'PENDING_REVIEW').length;
  const pagamentos = payments.filter((p) => ['PAYMENT_REPORTED', 'PAYMENT_UNDER_REVIEW'].includes(p.status)).length;

  return {
    cadastro, extras, equipe, documentos, pagamentos,
    total: cadastro + extras + equipe + documentos + pagamentos,
  };
}

/** Versão agregada por evento, para o contador da barra lateral. */
export function countEventPendings(
  suppliers: Supplier[],
  orders: SupplierOrder[],
  payments: Payment[],
  team: TeamMember[],
  documents: SupplierDocument[],
): number {
  return suppliers.reduce((total, s) => {
    const counts = countSupplierPendings(
      s,
      orders.filter((o) => o.supplierId === s.id),
      payments.filter((p) => p.supplierId === s.id),
      team.filter((m) => m.supplierId === s.id),
      documents.filter((d) => d.supplierId === s.id),
    );
    return total + counts.total;
  }, 0);
}
