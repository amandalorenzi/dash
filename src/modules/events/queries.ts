import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { FirestoreEvent } from '@/types/domain';

export async function listEvents(): Promise<FirestoreEvent[]> {
  const snap = await adminDb().collection(COLLECTIONS.events).orderBy('dataInicio', 'desc').get();
  return snap.docs.map((d) => d.data() as FirestoreEvent);
}

export async function getEventById(id: string): Promise<FirestoreEvent | null> {
  const doc = await adminDb().collection(COLLECTIONS.events).doc(id).get();
  return doc.exists ? (doc.data() as FirestoreEvent) : null;
}

/** Evento "atual" nesta primeira versão: o mais recente por data de início.
 *  Preparado para evoluir para uma preferência por admin sem mudar o resto do app. */
export async function getCurrentEvent(): Promise<FirestoreEvent | null> {
  const events = await listEvents();
  return events[0] ?? null;
}
