import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/config/firestore-collections';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
