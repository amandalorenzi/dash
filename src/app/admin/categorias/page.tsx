import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { listCategories } from '@/modules/categories/queries';
import { AppShell } from '@/components/layout/AppShell';
import { CategoriasClient } from '@/components/admin/CategoriasClient';
import { EmptyState } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();
  if (!eventId) {
    return <AppShell active="categorias" user={user}><EmptyState icon="📅" title="Nenhum evento" text="Crie um evento primeiro." /></AppShell>;
  }
  const [supplierCats, itemCats] = await Promise.all([
    listCategories(eventId, 'SUPPLIER'),
    listCategories(eventId, 'ITEM'),
  ]);
  return (
    <AppShell active="categorias" user={user}>
      <CategoriasClient eventId={eventId} supplierCategories={supplierCats} itemCategories={itemCats} />
    </AppShell>
  );
}
