import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';

export type CategoryKind = 'SUPPLIER' | 'ITEM';

export interface Category { id: string; eventId: string; name: string; kind: CategoryKind; }

export async function listCategories(eventId: string, kind?: CategoryKind): Promise<Category[]> {
  let ref = adminDb().collection(COLLECTIONS.categories).where('eventId', '==', eventId) as FirebaseFirestore.Query;
  if (kind) ref = ref.where('kind', '==', kind);
  const snap = await ref.get();
  const rows = snap.docs.map((d) => d.data() as Category);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
