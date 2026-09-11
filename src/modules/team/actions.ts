'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { getCurrentUser } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { getSupplierById } from '@/modules/suppliers/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { TeamMember } from '@/types/domain';
import { z } from 'zod';

const teamMemberSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do integrante.'),
  cargo: z.string().min(1, 'Informe o cargo/função.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  telefone: z.string().optional(),
  tipoCredencial: z.string().min(1, 'Selecione o tipo de credencial.'),
});

export async function listTeamMembers(supplierId: string): Promise<TeamMember[]> {
  const snap = await adminDb().collection(COLLECTIONS.teamMembers).where('supplierId', '==', supplierId).get();
  return snap.docs.map((d) => d.data() as TeamMember);
}

/** Usado tanto pelo admin quanto pelo próprio expositor (portal) — a
 *  identidade de quem está chamando decide o eventId/supplierId usados. */
export async function addTeamMemberAction(supplierId: string, raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };
  if (user.role === 'EXPOSITOR' && user.supplierId !== supplierId) return { ok: false, error: 'Não autorizado.' };
  if (user.role !== 'EXPOSITOR' && user.role !== 'SUPER_ADMIN') return { ok: false, error: 'Não autorizado.' };

  const parsed = teamMemberSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const ref = adminDb().collection(COLLECTIONS.teamMembers).doc();
  const member: TeamMember = {
    id: ref.id, eventId: supplier.eventId, supplierId, ...parsed.data, createdAt: new Date().toISOString(),
  };
  await ref.set(member);
  await addAuditLog({
    eventId: supplier.eventId, userName: user.role === 'EXPOSITOR' ? `${user.name} (expositor)` : user.name,
    entityType: 'EQUIPE', entityId: ref.id, entityLabel: `${member.nome} · ${supplier.nomeFantasia}`,
    action: 'ITEM_CRIADO', details: `Integrante de equipe cadastrado (${member.cargo}).`,
  });
  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function removeTeamMemberAction(memberId: string, supplierId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };
  if (user.role === 'EXPOSITOR' && user.supplierId !== supplierId) return { ok: false, error: 'Não autorizado.' };
  if (user.role !== 'EXPOSITOR' && user.role !== 'SUPER_ADMIN') return { ok: false, error: 'Não autorizado.' };

  await adminDb().collection(COLLECTIONS.teamMembers).doc(memberId).delete();
  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}
