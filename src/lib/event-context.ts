import 'server-only';
import { cookies } from 'next/headers';
import { listEvents } from '@/modules/events/queries';

const EVENT_COOKIE = 'dash_current_event';

export async function getCurrentEventId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(EVENT_COOKIE)?.value;
  const events = await listEvents();
  if (fromCookie && events.some((e) => e.id === fromCookie)) return fromCookie;
  return events[0]?.id ?? null;
}

export { EVENT_COOKIE };
