import { getCurrentUser } from '@/lib/auth/session';
import { listEvents } from '@/modules/events/queries';
import { getCurrentEventId } from '@/lib/event-context';
import { AppShell } from '@/components/layout/AppShell';
import { EventosClient } from '@/components/admin/EventosClient';

export const dynamic = 'force-dynamic';

export default async function EventosPage() {
  const user = (await getCurrentUser())!;
  const [events, currentEventId] = await Promise.all([listEvents(), getCurrentEventId()]);

  return (
    <AppShell active="eventos" user={user}>
      <EventosClient events={events} currentEventId={currentEventId} />
    </AppShell>
  );
}
