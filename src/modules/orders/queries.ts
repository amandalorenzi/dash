import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { SupplierOrder } from '@/types/domain';

export async function listOrdersByEvent(eventId: string): Promise<SupplierOrder[]> {
  const snap = await adminDb().collection(COLLECTIONS.orders).where('eventId', '==', eventId).get();
  return snap.docs.map((d) => d.data() as SupplierOrder);
}

export async function listOrdersBySupplier(supplierId: string): Promise<SupplierOrder[]> {
  const snap = await adminDb().collection(COLLECTIONS.orders).where('supplierId', '==', supplierId).get();
  return snap.docs.map((d) => d.data() as SupplierOrder);
}
