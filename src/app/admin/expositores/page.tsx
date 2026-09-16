import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { listSuppliersByEvent } from '@/modules/suppliers/queries';
import { listCategories } from '@/modules/categories/queries';
import { listOrdersByEvent } from '@/modules/orders/queries';
import { listPaymentsByEvent } from '@/modules/payments/queries';
import { listLastDiscussionMessageBySupplier } from '@/modules/discussions/queries';
import { countSupplierPendings } from '@/modules/approvals/pending';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import type { TeamMember, SupplierDocument } from '@/types/domain';
import { AppShell } from '@/components/layout/AppShell';
import { ExpositoresClient } from '@/components/admin/ExpositoresClient';
import { EmptyState } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function ExpositoresPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();

  if (!eventId) {
    return <AppShell active="expositores" user={user}><EmptyState icon="📅" title="Nenhum evento" text="Crie um evento em Configurações → Eventos antes de usar esta tela." /></AppShell>;
  }

  const [suppliers, categories, orders, payments, teamSnap, docsSnap, lastMessages] = await Promise.all([
    listSuppliersByEvent(eventId),
    listCategories(eventId, 'SUPPLIER'),
    listOrdersByEvent(eventId),
    listPaymentsByEvent(eventId),
    adminDb().collection(COLLECTIONS.teamMembers).where('eventId', '==', eventId).get(),
    adminDb().collection(COLLECTIONS.documents).where('eventId', '==', eventId).get(),
    listLastDiscussionMessageBySupplier(eventId),
  ]);
  const team = teamSnap.docs.map((d) => d.data() as TeamMember);
  const documents = docsSnap.docs.map((d) => d.data() as SupplierDocument);

  const alerts: Record<string, { pending: number; awaitingReply: boolean }> = {};
  suppliers.forEach((s) => {
    const counts = countSupplierPendings(
      s,
      orders.filter((o) => o.supplierId === s.id),
      payments.filter((p) => p.supplierId === s.id),
      team.filter((m) => m.supplierId === s.id),
      documents.filter((d) => d.supplierId === s.id),
    );
    const lastMsg = lastMessages.get(s.id);
    alerts[s.id] = { pending: counts.total, awaitingReply: Boolean(lastMsg && lastMsg.authorSide === 'EXPOSITOR') };
  });

  return (
    <AppShell active="expositores" user={user}>
      <ExpositoresClient eventId={eventId} suppliers={suppliers} categories={categories.map((c) => c.name)} alerts={alerts} />
    </AppShell>
  );
}
