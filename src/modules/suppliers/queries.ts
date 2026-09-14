import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { Supplier } from '@/types/domain';

export async function listSuppliersByEvent(eventId: string): Promise<Supplier[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.suppliers)
    .where('eventId', '==', eventId)
    .get();
  // Ordenação feita em memória de propósito: combinar where + orderBy no
  // Firestore exigiria criar um índice composto manualmente no console,
  // o que já causou erro em produção. O volume por evento é pequeno.
  return snap.docs
    .map((d) => d.data() as Supplier)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const doc = await adminDb().collection(COLLECTIONS.suppliers).doc(id).get();
  return doc.exists ? (doc.data() as Supplier) : null;
}

export async function findSupplierByCnpj(eventId: string, cnpj: string, excludeId?: string): Promise<Supplier | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.suppliers)
    .where('eventId', '==', eventId)
    .where('cnpj', '==', cnpj)
    .limit(2)
    .get();
  const match = snap.docs.find((d) => d.id !== excludeId);
  return match ? (match.data() as Supplier) : null;
}

export function suppliersNeedingAttention(suppliers: Supplier[]): Supplier[] {
  return suppliers.filter((s) =>
    ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION'].includes(s.statusCadastral) ||
    ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(s.statusDash) ||
    ['PAYMENT_PENDING', 'PAYMENT_REPORTED', 'OVERDUE'].includes(s.statusFinanceiro),
  );
}
