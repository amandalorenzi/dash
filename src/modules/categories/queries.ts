import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';

export interface Category { id: string; eventId: string; name: string; }

export async function listCategories(eventId: string): Promise<Category[]> {
  const snap = await adminDb().collection(COLLECTIONS.categories).where('eventId', '==', eventId).orderBy('name').get();
  return snap.docs.map((d) => d.data() as Category);
}
