import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { listSuppliersByEvent } from '@/modules/suppliers/queries';
import { listOrdersByEvent } from '@/modules/orders/queries';
import { listPaymentsByEvent } from '@/modules/payments/queries';
import { countEventPendings } from '@/modules/approvals/pending';
import type { TeamMember, SupplierDocument } from '@/types/domain';

/** Total de itens aguardando ação da DASH no evento — usado no badge da sidebar. */
export async function getEventPendingCount(eventId: string): Promise<number> {
  const [suppliers, orders, payments, teamSnap, docsSnap] = await Promise.all([
    listSuppliersByEvent(eventId),
    listOrdersByEvent(eventId),
    listPaymentsByEvent(eventId),
    adminDb().collection(COLLECTIONS.teamMembers).where('eventId', '==', eventId).get(),
    adminDb().collection(COLLECTIONS.documents).where('eventId', '==', eventId).get(),
  ]);

  return countEventPendings(
    suppliers, orders, payments,
    teamSnap.docs.map((d) => d.data() as TeamMember),
    docsSnap.docs.map((d) => d.data() as SupplierDocument),
  );
}
