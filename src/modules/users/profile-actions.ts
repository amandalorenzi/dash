'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { getCurrentUser } from '@/lib/auth/session';
import type { ActionResult } from '@/modules/suppliers/actions';
import { z } from 'zod';

/**
 * Avatar é armazenado como URL externa (link de imagem) — não usa Firebase
 * Storage nesta versão, mantendo o padrão do projeto de não depender de upload
 * de binário. Vale tanto para a equipe DASH quanto para expositores.
 */
const avatarSchema = z.string().trim().max(1000).refine(
  (v) => v === '' || /^https:\/\/.+/i.test(v),
  { message: 'Informe um link de imagem começando com https:// (ou deixe em branco para remover).' },
);

export async function updateMyAvatarAction(avatarUrl: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };

  const parsed = avatarSchema.safeParse(avatarUrl);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Link inválido.' };

  await adminDb().collection(COLLECTIONS.profiles).doc(user.uid)
    .update({ avatarUrl: parsed.data === '' ? null : parsed.data });

  revalidatePath('/portal');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/usuarios');
  return { ok: true };
}
