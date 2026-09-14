import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { DiscussionMessage } from '@/types/domain';

export async function listDiscussion(supplierId: string): Promise<DiscussionMessage[]> {
  const snap = await adminDb().collection(COLLECTIONS.discussions).where('supplierId', '==', supplierId).get();
  // Ordenação em memória — mantém o padrão do projeto de não exigir índice composto.
  return snap.docs
    .map((d) => d.data() as DiscussionMessage)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
