import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { Deadline } from '@/types/domain';

export async function listDeadlinesByEvent(eventId: string): Promise<Deadline[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.deadlines)
    .where('eventId', '==', eventId)
    .get();
  // Ordenação em memória — evita exigir índice composto no Firestore.
  return snap.docs
    .map((d) => d.data() as Deadline)
    .sort((a, b) => (a.dataLimite ?? '').localeCompare(b.dataLimite ?? ''));
}
