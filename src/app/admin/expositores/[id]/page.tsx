import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupplierById } from '@/modules/suppliers/queries';
import { listOrdersBySupplier } from '@/modules/orders/queries';
import { listPaymentsBySupplier } from '@/modules/payments/queries';
import { listCatalogItemsByEvent } from '@/modules/catalog/queries';
import { listTeamMembers } from '@/modules/team/actions';
import { listDocuments } from '@/modules/documents/actions';
import { listAuditLogsForEntity } from '@/modules/audit/log';
import { listDiscussion } from '@/modules/discussions/queries';
import { countSupplierPendings } from '@/modules/approvals/pending';
import { AppShell } from '@/components/layout/AppShell';
import { ExpositorDetailClient } from '@/components/admin/ExpositorDetailClient';

export const dynamic = 'force-dynamic';

export default async function ExpositorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const [orders, payments, catalogItems, team, documents, auditLogs, discussion] = await Promise.all([
    listOrdersBySupplier(id),
    listPaymentsBySupplier(id),
    listCatalogItemsByEvent(supplier.eventId),
    listTeamMembers(id),
    listDocuments(id),
    listAuditLogsForEntity(supplier.eventId, id),
    listDiscussion(id),
  ]);

  const pendings = countSupplierPendings(supplier, orders, payments, team, documents);

  return (
    <AppShell active="expositores" user={user}>
      <ExpositorDetailClient
        supplier={supplier}
        orders={orders}
        payments={payments}
        catalogItems={catalogItems.filter((i) => i.active)}
        team={team}
        documents={documents}
        auditLogs={auditLogs}
        discussion={discussion}
        pendings={pendings}
      />
    </AppShell>
  );
}
