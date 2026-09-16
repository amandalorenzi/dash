import { getCurrentUser } from '@/lib/auth/session';
import { listEvents } from '@/modules/events/queries';
import { listDeadlinesByEvent } from '@/modules/deadlines/queries';
import { getCurrentEventId } from '@/lib/event-context';
import { AppShell } from '@/components/layout/AppShell';
import { EventosClient } from '@/components/admin/EventosClient';

export const dynamic = 'force-dynamic';

export default async function EventosPage() {
  const user = (await getCurrentUser())!;
  const [events, currentEventId] = await Promise.all([listEvents(), getCurrentEventId()]);
  const deadlinesByEvent: Record<string, Awaited<ReturnType<typeof listDeadlinesByEvent>>> = {};
  await Promise.all(events.map(async (e) => { deadlinesByEvent[e.id] = await listDeadlinesByEvent(e.id); }));

  return (
    <AppShell active="eventos" user={user}>
      <EventosClient events={events} currentEventId={currentEventId} deadlinesByEvent={deadlinesByEvent} />
    </AppShell>
  );
}
