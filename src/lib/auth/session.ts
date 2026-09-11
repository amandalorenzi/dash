import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, SESSION_COOKIE_NAME } from '@/config/firestore-collections';
import type { UserProfile, Role } from '@/types/domain';

/**
 * Lê e valida o cookie de sessão no servidor (nunca confia no frontend).
 * Retorna o perfil completo (com role) vindo do Firestore, ou null.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const snap = await adminDb().collection(COLLECTIONS.profiles).doc(decoded.uid).get();
    if (!snap.exists) return null;
    return snap.data() as UserProfile;
  } catch {
    // cookie inválido, expirado ou revogado
    return null;
  }
}

/**
 * Uso em Server Components de página/layout: garante que existe um
 * usuário autenticado com a role esperada. Lança um erro conhecido que
 * a página deve capturar para fazer o redirect (ver app/admin/layout.tsx).
 */
export async function requireRole(role: Role): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user || user.role !== role) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
