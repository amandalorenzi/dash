import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { AuditLog } from '@/types/domain';

export async function addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.auditLogs).doc();
  const log: AuditLog = { ...entry, id: ref.id, createdAt: new Date().toISOString() };
  await ref.set(log);
}

export async function listAuditLogsForEntity(eventId: string, entityId: string, limit = 50): Promise<AuditLog[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.auditLogs)
    .where('eventId', '==', eventId)
    .where('entityId', '==', entityId)
    .get();
  // Ordenação e corte em memória — evita exigir índice composto no Firestore.
  return snap.docs
    .map((d) => d.data() as AuditLog)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
