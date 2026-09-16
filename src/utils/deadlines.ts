import type { Deadline, FirestoreEvent } from '@/types/domain';

/**
 * O prazo final de pedidos (event.orderDeadline) é configurado junto com o
 * evento, não como um registro separado na coleção `deadlines` — mas
 * precisa aparecer junto com os demais prazos na visão do expositor. Esta
 * função gera esse item "virtual" e devolve tudo já ordenado.
 */
export function mergeDeadlinesWithEvent(event: FirestoreEvent | null, deadlines: Deadline[]): Deadline[] {
  const merged = [...deadlines];
  if (event?.orderDeadline) {
    merged.push({
      id: '__order_deadline__',
      eventId: event.id,
      titulo: 'Prazo final para envio de pedidos de extras',
      descricao: 'Depois desta data não é mais possível solicitar novos itens extras pelo portal.',
      dataLimite: event.orderDeadline,
    });
  }
  return merged.sort((a, b) => (a.dataLimite ?? '').localeCompare(b.dataLimite ?? ''));
}
