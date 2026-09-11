import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { listCatalogItemsByEvent } from '@/modules/catalog/queries';
import { listCategories } from '@/modules/categories/queries';
import { AppShell } from '@/components/layout/AppShell';
import { CatalogoClient } from '@/components/admin/CatalogoClient';
import { EmptyState } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();

  if (!eventId) {
    return <AppShell active="catalogo" user={user}><EmptyState icon="📅" title="Nenhum evento" text="Cadastre um evento primeiro." /></AppShell>;
  }

  const [items, categories] = await Promise.all([listCatalogItemsByEvent(eventId), listCategories(eventId)]);

  return (
    <AppShell active="catalogo" user={user}>
      <CatalogoClient eventId={eventId} items={items} categories={categories.map((c) => c.name)} />
    </AppShell>
  );
}
