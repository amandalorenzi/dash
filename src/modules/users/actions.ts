'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { generateTempPassword } from '@/lib/passwords';
import type { UserProfile, Role } from '@/types/domain';
import { z } from 'zod';

export type UserActionResult =
  | { ok: true; credentials?: { email: string; tempPassword: string } }
  | { ok: false; error: string };

/** Papéis que podem ser atribuídos por esta tela (EXPOSITOR é criado pela tela de expositores). */
const ASSIGNABLE_ROLES = ['SUPER_ADMIN', 'PRODUCAO', 'FINANCEIRO', 'OPERACIONAL'] as const;

const userSchema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function listUsersAction(): Promise<UserProfile[]> {
  await requireRole('SUPER_ADMIN');
  const snap = await adminDb().collection(COLLECTIONS.profiles).get();
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export async function createUserAction(raw: unknown): Promise<UserActionResult> {
  const admin = await requireRole('SUPER_ADMIN');
  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const { name, email, role } = parsed.data;

  const tempPassword = generateTempPassword();
  let uid: string;
  try {
    const created = await adminAuth().createUser({ email, password: tempPassword, displayName: name, emailVerified: true });
    uid = created.uid;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-exists') return { ok: false, error: 'Já existe um usuário com este e-mail.' };
    return { ok: false, error: 'Não foi possível criar o usuário.' };
  }

  const profile: UserProfile = {
    uid, email, name, role, supplierId: null, eventId: null, mustChangePassword: true, createdAt: new Date().toISOString(),
  };
  await adminDb().collection(COLLECTIONS.profiles).doc(uid).set(profile);
  await addAuditLog({
    eventId: '-', userName: admin.name, entityType: 'USUARIO', entityId: uid, entityLabel: name,
    action: 'USUARIO_CRIADO', details: `Usuário criado com papel ${role}.`,
  });

  revalidatePath('/admin/usuarios');
  return { ok: true, credentials: { email, tempPassword } };
}

export async function updateUserRoleAction(uid: string, role: Role): Promise<UserActionResult> {
  const admin = await requireRole('SUPER_ADMIN');
  if (uid === admin.uid) return { ok: false, error: 'Você não pode alterar o seu próprio papel.' };

  const ref = adminDb().collection(COLLECTIONS.profiles).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Usuário não encontrado.' };
  const profile = snap.data() as UserProfile;
  if (profile.role === 'EXPOSITOR') return { ok: false, error: 'Use a tela de expositores para gerenciar acessos de expositor.' };

  await ref.update({ role });
  await addAuditLog({
    eventId: '-', userName: admin.name, entityType: 'USUARIO', entityId: uid, entityLabel: profile.name,
    action: 'STATUS_ALTERADO', details: `Papel alterado para ${role}.`,
  });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function resetUserPasswordAction(uid: string): Promise<UserActionResult> {
  const admin = await requireRole('SUPER_ADMIN');
  const ref = adminDb().collection(COLLECTIONS.profiles).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Usuário não encontrado.' };
  const profile = snap.data() as UserProfile;

  const tempPassword = generateTempPassword();
  try {
    await adminAuth().updateUser(uid, { password: tempPassword });
  } catch {
    return { ok: false, error: 'Não foi possível gerar a nova senha.' };
  }
  await ref.update({ mustChangePassword: true });
  await addAuditLog({
    eventId: '-', userName: admin.name, entityType: 'USUARIO', entityId: uid, entityLabel: profile.name,
    action: 'STATUS_ALTERADO', details: 'Nova senha temporária gerada.',
  });
  revalidatePath('/admin/usuarios');
  return { ok: true, credentials: { email: profile.email, tempPassword } };
}

export async function deleteUserAction(uid: string): Promise<UserActionResult> {
  const admin = await requireRole('SUPER_ADMIN');
  if (uid === admin.uid) return { ok: false, error: 'Você não pode remover o seu próprio usuário.' };

  const ref = adminDb().collection(COLLECTIONS.profiles).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Usuário não encontrado.' };
  const profile = snap.data() as UserProfile;
  if (profile.role === 'EXPOSITOR') return { ok: false, error: 'Use a tela de expositores para gerenciar acessos de expositor.' };

  try { await adminAuth().deleteUser(uid); } catch { /* usuário já pode ter sido removido no console */ }
  await ref.delete();
  await addAuditLog({
    eventId: '-', userName: admin.name, entityType: 'USUARIO', entityId: uid, entityLabel: profile.name,
    action: 'STATUS_ALTERADO', details: 'Usuário removido.',
  });
  revalidatePath('/admin/usuarios');
  return { ok: true };
}
