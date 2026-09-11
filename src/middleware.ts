import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/config/firestore-collections';

/**
 * Este middleware roda no Edge Runtime e por isso NÃO pode usar o
 * firebase-admin (depende de APIs Node). Ele faz apenas uma checagem
 * rápida de presença do cookie para UX (evitar um flash da tela admin
 * antes do redirect). A autorização de verdade — validar o cookie e
 * conferir a role — acontece sempre no servidor, em
 * src/lib/auth/session.ts, dentro dos layouts de /admin e /portal.
 * Ou seja: o front nunca é a única barreira de autorização.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/portal');
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirected', '1');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};
