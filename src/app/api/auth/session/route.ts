import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, SESSION_COOKIE_NAME } from '@/config/firestore-collections';

export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 dias

/**
 * Recebe o idToken obtido no cliente (após signInWithEmailAndPassword) e
 * cria um cookie de sessão httpOnly assinado pelo Firebase. O navegador
 * nunca guarda credenciais nem tokens de longa duração em localStorage.
 */
export async function POST(request: NextRequest) {
  const { idToken } = await request.json().catch(() => ({ idToken: null }));
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Token ausente.' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);

    // Garante que o usuário tem um perfil (role) cadastrado no Firestore.
    // Sem perfil, o login é recusado mesmo com credenciais válidas do Auth.
    const profileSnap = await adminDb().collection(COLLECTIONS.profiles).doc(decoded.uid).get();
    if (!profileSnap.exists) {
      return NextResponse.json(
        { error: 'Usuário autenticado, mas sem perfil cadastrado no sistema. Contate o administrador.' },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    const profile = profileSnap.data();

    const response = NextResponse.json({ role: profile?.role ?? null, mustChangePassword: Boolean(profile?.mustChangePassword) });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS / 1000,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Falha ao criar sessão:', err);
    return NextResponse.json({ error: 'Não foi possível autenticar. Tente novamente.' }, { status: 401 });
  }
}
