import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { Payment } from '@/types/domain';

export async function listPaymentsByEvent(eventId: string): Promise<Payment[]> {
  const snap = await adminDb().collection(COLLECTIONS.payments).where('eventId', '==', eventId).get();
  return snap.docs.map((d) => d.data() as Payment);
}

export async function listPaymentsBySupplier(supplierId: string): Promise<Payment[]> {
  const snap = await adminDb().collection(COLLECTIONS.payments).where('supplierId', '==', supplierId).get();
  return snap.docs.map((d) => d.data() as Payment);
}
