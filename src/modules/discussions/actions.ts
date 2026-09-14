'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupplierById } from '@/modules/suppliers/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { DiscussionMessage } from '@/types/domain';

/**
 * Conversa entre a equipe DASH e um expositor. Serve tanto para o admin
 * (aba "Discussão" no detalhe do expositor) quanto para o próprio expositor
 * (aba "Discussões" no portal) — quem está autenticado define o lado.
 */
export async function postDiscussionMessageAction(supplierId: string, message: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };
  if (user.role === 'EXPOSITOR' && user.supplierId !== supplierId) return { ok: false, error: 'Não autorizado.' };

  const trimmed = message.trim();
  if (trimmed.length < 1) return { ok: false, error: 'Escreva uma mensagem.' };
  if (trimmed.length > 4000) return { ok: false, error: 'Mensagem muito longa (máximo 4000 caracteres).' };

  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const ref = adminDb().collection(COLLECTIONS.discussions).doc();
  const entry: DiscussionMessage = {
    id: ref.id, eventId: supplier.eventId, supplierId,
    authorName: user.name, authorAvatarUrl: user.avatarUrl ?? null,
    authorSide: user.role === 'EXPOSITOR' ? 'EXPOSITOR' : 'DASH',
    message: trimmed, createdAt: new Date().toISOString(),
  };
  await ref.set(entry);

  revalidatePath(`/admin/expositores/${supplierId}`);
  revalidatePath('/portal');
  return { ok: true };
}

export async function deleteDiscussionMessageAction(messageId: string, supplierId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };

  const ref = adminDb().collection(COLLECTIONS.discussions).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Mensagem não encontrada.' };
  const entry = snap.data() as DiscussionMessage;

  // Expositor só remove a própria mensagem; admin pode remover qualquer uma.
  const isOwnMessage = entry.authorName === user.name && entry.supplierId === user.supplierId;
  if (user.role === 'EXPOSITOR' && !isOwnMessage) return { ok: false, error: 'Não autorizado.' };
  if (user.role !== 'EXPOSITOR' && user.role !== 'SUPER_ADMIN') return { ok: false, error: 'Não autorizado.' };

  await ref.delete();
  revalidatePath(`/admin/expositores/${supplierId}`);
  revalidatePath('/portal');
  return { ok: true };
}
