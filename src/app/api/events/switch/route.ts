import { NextRequest, NextResponse } from 'next/server';
import { EVENT_COOKIE } from '@/lib/event-context';
import { requireRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireRole('SUPER_ADMIN');
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: 'eventId ausente.' }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(EVENT_COOKIE, eventId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
