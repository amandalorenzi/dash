import type { OrderItem, SupplierOrder, Payment } from '@/types/domain';

/** Total de uma linha de pedido: sempre a partir do snapshot de preço, nunca do catálogo atual. */
export function calculateOrderItemTotal(item: Pick<OrderItem, 'unitPriceSnapshot' | 'quantity'>): number {
  return round2(item.unitPriceSnapshot * item.quantity);
}

/** Total de um pedido (soma de todas as linhas, aprovadas ou não). */
export function calculateOrderTotal(order: Pick<SupplierOrder, 'items'>): number {
  return round2(order.items.reduce((sum, item) => sum + calculateOrderItemTotal(item), 0));
}

/** Total apenas dos itens já aprovados pela DASH dentro de um pedido. */
export function calculateOrderApprovedTotal(order: Pick<SupplierOrder, 'items'>): number {
  return round2(
    order.items
      .filter((item) => item.approvalStatus === 'APPROVED')
      .reduce((sum, item) => sum + calculateOrderItemTotal(item), 0),
  );
}

export interface SupplierBalance {
  solicitado: number;
  aprovado: number;
  pago: number;
  saldoPendente: number;
}

/**
 * Consolida solicitado / aprovado / pago / saldo pendente de um expositor.
 * Esta é A fonte única de verdade para esses valores — nunca recalcular
 * isso de outra forma em uma tela específica.
 */
export function calculateSupplierBalance(orders: SupplierOrder[], payments: Payment[]): SupplierBalance {
  const solicitado = round2(orders.reduce((sum, o) => sum + calculateOrderTotal(o), 0));
  const aprovado = round2(orders.reduce((sum, o) => sum + calculateOrderApprovedTotal(o), 0));
  const pago = round2(payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0));
  const saldoPendente = round2(Math.max(aprovado - pago, 0));
  return { solicitado, aprovado, pago, saldoPendente };
}

/** Evita erros de ponto flutuante em valores monetários (2 casas decimais). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
