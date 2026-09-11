import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { CatalogItem } from '@/types/domain';

export async function listCatalogItemsByEvent(eventId: string): Promise<CatalogItem[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.catalogItems)
    .where('eventId', '==', eventId)
    .orderBy('code', 'asc')
    .get();
  return snap.docs.map((d) => d.data() as CatalogItem);
}

export async function findCatalogItemByCode(eventId: string, code: string, excludeId?: string): Promise<CatalogItem | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.catalogItems)
    .where('eventId', '==', eventId)
    .where('code', '==', code)
    .limit(2)
    .get();
  const match = snap.docs.find((d) => d.id !== excludeId);
  return match ? (match.data() as CatalogItem) : null;
}
