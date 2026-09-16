'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { Deadline } from '@/types/domain';
import { z } from 'zod';

const deadlineSchema = z.object({
  titulo: z.string().min(2, 'Informe o título do prazo.'),
  descricao: z.string().optional().transform((v) => v ?? ''),
  dataLimite: z.string().min(1, 'Informe a data limite.'),
});

export async function createDeadlineAction(eventId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = deadlineSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const ref = adminDb().collection(COLLECTIONS.deadlines).doc();
  const deadline: Deadline = { id: ref.id, eventId, ...parsed.data };
  await ref.set(deadline);

  await addAuditLog({
    eventId, userName: user.name, entityType: 'EVENTO', entityId: eventId, entityLabel: deadline.titulo,
    action: 'EVENTO_EDITADO', details: `Prazo criado: ${deadline.titulo}.`,
  });
  revalidatePath('/admin/eventos');
  revalidatePath('/portal');
  return { ok: true };
}

export async function deleteDeadlineAction(deadlineId: string): Promise<ActionResult> {
  await requireRole('SUPER_ADMIN');
  await adminDb().collection(COLLECTIONS.deadlines).doc(deadlineId).delete();
  revalidatePath('/admin/eventos');
  revalidatePath('/portal');
  return { ok: true };
}
