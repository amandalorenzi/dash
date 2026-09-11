import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { listSuppliersByEvent } from '@/modules/suppliers/queries';
import { listCategories } from '@/modules/categories/queries';
import { AppShell } from '@/components/layout/AppShell';
import { ExpositoresClient } from '@/components/admin/ExpositoresClient';
import { EmptyState } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function ExpositoresPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();

  if (!eventId) {
    return <AppShell active="expositores" user={user}><EmptyState icon="📅" title="Nenhum evento" text="Cadastre um evento primeiro." /></AppShell>;
  }

  const [suppliers, categories] = await Promise.all([listSuppliersByEvent(eventId), listCategories(eventId)]);

  return (
    <AppShell active="expositores" user={user}>
      <ExpositoresClient eventId={eventId} suppliers={suppliers} categories={categories.map((c) => c.name)} />
    </AppShell>
  );
}
