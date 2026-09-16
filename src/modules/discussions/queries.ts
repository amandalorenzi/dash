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

/** Última mensagem de cada expositor no evento — usado para o indicador "aguardando resposta da DASH". */
export async function listLastDiscussionMessageBySupplier(eventId: string): Promise<Map<string, DiscussionMessage>> {
  const snap = await adminDb().collection(COLLECTIONS.discussions).where('eventId', '==', eventId).get();
  const bySupplier = new Map<string, DiscussionMessage>();
  snap.docs.forEach((d) => {
    const msg = d.data() as DiscussionMessage;
    const current = bySupplier.get(msg.supplierId);
    if (!current || msg.createdAt > current.createdAt) bySupplier.set(msg.supplierId, msg);
  });
  return bySupplier;
}
