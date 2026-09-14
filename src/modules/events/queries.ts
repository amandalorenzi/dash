import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { FirestoreEvent, EventUpdate } from '@/types/domain';

export async function listEvents(): Promise<FirestoreEvent[]> {
  const snap = await adminDb().collection(COLLECTIONS.events).get();
  const rows = snap.docs.map((d) => d.data() as FirestoreEvent);
  // ordenação em memória evita exigir índice composto no Firestore
  return rows.sort((a, b) => (b.dataInicio ?? '').localeCompare(a.dataInicio ?? ''));
}

export async function getEventById(id: string): Promise<FirestoreEvent | null> {
  const doc = await adminDb().collection(COLLECTIONS.events).doc(id).get();
  return doc.exists ? (doc.data() as FirestoreEvent) : null;
}

export async function getCurrentEvent(): Promise<FirestoreEvent | null> {
  const events = await listEvents();
  return events[0] ?? null;
}

export async function listEventUpdates(eventId: string, limit = 50): Promise<EventUpdate[]> {
  const snap = await adminDb().collection(COLLECTIONS.eventUpdates).where('eventId', '==', eventId).get();
  const rows = snap.docs.map((d) => d.data() as EventUpdate);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
