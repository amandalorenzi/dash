import { describe, it, expect } from 'vitest';
import {
  calculateOrderItemTotal,
  calculateOrderTotal,
  calculateOrderApprovedTotal,
  calculateSupplierBalance,
  round2,
} from '@/modules/orders/calculations';
import type { OrderItem, SupplierOrder, Payment } from '@/types/domain';

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'oi1', catalogItemId: 'cat1', codeSnapshot: 'MOB-001', nameSnapshot: 'Banqueta alta',
    unitSnapshot: 'UNIT', unitPriceSnapshot: 90, quantity: 2, approvalStatus: 'PENDING',
    ...overrides,
  };
}

function makeOrder(items: OrderItem[], overrides: Partial<SupplierOrder> = {}): SupplierOrder {
  return {
    id: 'ord1', eventId: 'evt1', supplierId: 'sup1', status: 'SUBMITTED', items,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateOrderItemTotal', () => {
  it('multiplica preço snapshot pela quantidade', () => {
    expect(calculateOrderItemTotal(makeItem({ unitPriceSnapshot: 90, quantity: 3 }))).toBe(270);
  });

  it('arredonda corretamente valores com centavos', () => {
    expect(calculateOrderItemTotal(makeItem({ unitPriceSnapshot: 33.33, quantity: 3 }))).toBe(99.99);
  });
});

describe('calculateOrderTotal', () => {
  it('soma todas as linhas do pedido, aprovadas ou não', () => {
    const order = makeOrder([
      makeItem({ id: 'a', unitPriceSnapshot: 90, quantity: 2, approvalStatus: 'APPROVED' }),
      makeItem({ id: 'b', unitPriceSnapshot: 450, quantity: 1, approvalStatus: 'PENDING' }),
    ]);
    expect(calculateOrderTotal(order)).toBe(630);
  });
});

describe('calculateOrderApprovedTotal', () => {
  it('soma apenas itens aprovados', () => {
    const order = makeOrder([
      makeItem({ id: 'a', unitPriceSnapshot: 90, quantity: 2, approvalStatus: 'APPROVED' }),
      makeItem({ id: 'b', unitPriceSnapshot: 450, quantity: 1, approvalStatus: 'REJECTED' }),
      makeItem({ id: 'c', unitPriceSnapshot: 45, quantity: 4, approvalStatus: 'PENDING' }),
    ]);
    expect(calculateOrderApprovedTotal(order)).toBe(180);
  });
});

describe('calculateSupplierBalance — regra de negócio central', () => {
  it('calcula solicitado, aprovado, pago e saldo pendente corretamente', () => {
    const orders: SupplierOrder[] = [
      makeOrder([makeItem({ id: 'a', unitPriceSnapshot: 90, quantity: 2, approvalStatus: 'APPROVED' })], { id: 'ord1' }),
      makeOrder([makeItem({ id: 'b', unitPriceSnapshot: 650, quantity: 3, approvalStatus: 'APPROVED' })], { id: 'ord2' }),
    ];
    const payments: Payment[] = [
      { id: 'p1', eventId: 'evt1', supplierId: 'sup1', amount: 500, status: 'PAID', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', eventId: 'evt1', supplierId: 'sup1', amount: 999, status: 'PAYMENT_PENDING', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const balance = calculateSupplierBalance(orders, payments);
    expect(balance.solicitado).toBe(2130);
    expect(balance.aprovado).toBe(2130);
    expect(balance.pago).toBe(500); // pagamento PENDING não entra na soma
    expect(balance.saldoPendente).toBe(1630);
  });

  it('nunca retorna saldo pendente negativo (pagamento excedente)', () => {
    const orders = [makeOrder([makeItem({ unitPriceSnapshot: 100, quantity: 1, approvalStatus: 'APPROVED' })])];
    const payments: Payment[] = [
      { id: 'p1', eventId: 'evt1', supplierId: 'sup1', amount: 500, status: 'PAID', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    expect(calculateSupplierBalance(orders, payments).saldoPendente).toBe(0);
  });
});

describe('snapshot de preço — princípio fundamental do catálogo', () => {
  it('o total de um item já contratado não muda mesmo que o preço "atual" no catálogo mude depois', () => {
    // O item foi contratado quando o catálogo estava R$ 90 (snapshot).
    const item = makeItem({ unitPriceSnapshot: 90, quantity: 1 });
    const precoAtualDoCatalogoDepoisDeUmaImportacao = 110; // não usado no cálculo
    expect(calculateOrderItemTotal(item)).toBe(90);
    expect(calculateOrderItemTotal(item)).not.toBe(precoAtualDoCatalogoDepoisDeUmaImportacao);
  });
});

describe('round2', () => {
  it('evita erros clássicos de ponto flutuante', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
