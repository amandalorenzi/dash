import { describe, it, expect } from 'vitest';
import { generateTempPassword } from '@/lib/passwords';

/**
 * Regra de prazo de pedidos: a comparação é feita por data (YYYY-MM-DD),
 * de forma que o prazo vale até o fim do dia informado.
 */
function isOrderDeadlinePassed(today: string, orderDeadline: string | null): boolean {
  return Boolean(orderDeadline && today > orderDeadline);
}

describe('prazo para envio de pedidos', () => {
  it('permite pedidos antes do prazo', () => {
    expect(isOrderDeadlinePassed('2026-10-01', '2026-10-20')).toBe(false);
  });

  it('permite pedidos no último dia do prazo', () => {
    expect(isOrderDeadlinePassed('2026-10-20', '2026-10-20')).toBe(false);
  });

  it('bloqueia pedidos depois do prazo', () => {
    expect(isOrderDeadlinePassed('2026-10-21', '2026-10-20')).toBe(true);
  });

  it('não bloqueia nada quando o evento não tem prazo definido', () => {
    expect(isOrderDeadlinePassed('2030-01-01', null)).toBe(false);
  });
});

describe('senha temporária', () => {
  it('tem pelo menos 12 caracteres', () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(12);
  });

  it('contém maiúscula, minúscula, número e símbolo', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateTempPassword();
      expect(/[A-Z]/.test(pwd), `sem maiúscula: ${pwd}`).toBe(true);
      expect(/[a-z]/.test(pwd), `sem minúscula: ${pwd}`).toBe(true);
      expect(/[0-9]/.test(pwd), `sem número: ${pwd}`).toBe(true);
      expect(/[!@#$%*]/.test(pwd), `sem símbolo: ${pwd}`).toBe(true);
    }
  });

  it('não repete a mesma senha entre chamadas', () => {
    const generated = new Set(Array.from({ length: 100 }, () => generateTempPassword()));
    expect(generated.size).toBe(100);
  });

  it('evita caracteres ambíguos (0, O, 1, l, I)', () => {
    for (let i = 0; i < 50; i++) {
      expect(/[0O1lI]/.test(generateTempPassword())).toBe(false);
    }
  });
});
