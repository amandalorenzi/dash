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
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as AuditLog);
}
