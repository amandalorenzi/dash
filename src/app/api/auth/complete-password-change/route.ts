import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, SESSION_COOKIE_NAME } from '@/config/firestore-collections';

export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 dias

/**
 * Conclui a troca obrigatória de senha.
 *
 * Por que esta rota existe: trocar a senha no Firebase Auth **revoga as
 * sessões existentes**. Como validamos o cookie de sessão com
 * `checkRevoked: true`, o cookie criado no login morre no exato momento em
 * que a senha é alterada — e qualquer Server Action chamada depois disso
 * falharia com "sessão inválida".
 *
 * Então o cliente, logo após o `updatePassword`, pede um idToken novo
 * (`getIdToken(true)`) e manda para cá. Aqui a gente verifica esse token,
 * emite um cookie de sessão novo e só então limpa o `mustChangePassword`.
 */
export async function POST(request: NextRequest) {
  const { idToken } = await request.json().catch(() => ({ idToken: null }));
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Token ausente. Faça login novamente.' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    const profileRef = adminDb().collection(COLLECTIONS.profiles).doc(decoded.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      return NextResponse.json({ error: 'Perfil não encontrado. Contate o administrador.' }, { status: 403 });
    }

    await profileRef.update({ mustChangePassword: false });

    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    const profile = profileSnap.data();

    const response = NextResponse.json({ ok: true, role: profile?.role ?? null });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS / 1000,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Falha ao concluir troca de senha:', err);
    return NextResponse.json({ error: 'Não foi possível concluir a troca de senha. Faça login novamente com a senha nova.' }, { status: 401 });
  }
}
