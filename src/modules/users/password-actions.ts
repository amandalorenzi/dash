'use server';

import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { getCurrentUser } from '@/lib/auth/session';
import type { ActionResult } from '@/modules/suppliers/actions';

/** Chamado pelo cliente logo depois que a senha foi trocada com sucesso no Firebase Auth. */
export async function clearMustChangePasswordAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };
  await adminDb().collection(COLLECTIONS.profiles).doc(user.uid).update({ mustChangePassword: false });
  return { ok: true };
}
