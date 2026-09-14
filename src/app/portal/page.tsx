import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupplierById } from '@/modules/suppliers/queries';
import { getEventById, listEventUpdates } from '@/modules/events/queries';
import { listOrdersBySupplier } from '@/modules/orders/queries';
import { listPaymentsBySupplier } from '@/modules/payments/queries';
import { listCatalogItemsByEvent } from '@/modules/catalog/queries';
import { listTeamMembers } from '@/modules/team/actions';
import { listDocuments } from '@/modules/documents/actions';
import { listDeadlinesByEvent } from '@/modules/deadlines/queries';
import { listDiscussion } from '@/modules/discussions/queries';
import { PortalClient } from '@/components/portal/PortalClient';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const user = (await getCurrentUser())!;
  if (!user.supplierId) redirect('/login');

  const supplier = await getSupplierById(user.supplierId);
  if (!supplier) redirect('/login');

  const [event, updates, orders, payments, catalogItems, team, documents, deadlines, discussion] = await Promise.all([
    getEventById(supplier.eventId),
    listEventUpdates(supplier.eventId),
    listOrdersBySupplier(supplier.id),
    listPaymentsBySupplier(supplier.id),
    listCatalogItemsByEvent(supplier.eventId),
    listTeamMembers(supplier.id),
    listDocuments(supplier.id),
    listDeadlinesByEvent(supplier.eventId),
    listDiscussion(supplier.id),
  ]);

  return (
    <PortalClient
      userName={user.name}
      userAvatarUrl={user.avatarUrl}
      eventName={event?.name ?? ''}
      event={event}
      updates={updates}
      supplier={supplier}
      orders={orders}
      payments={payments}
      catalogItems={catalogItems.filter((i) => i.active)}
      team={team}
      documents={documents}
      deadlines={deadlines}
      discussion={discussion}
    />
  );
}
