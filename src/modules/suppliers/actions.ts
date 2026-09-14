'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole, getCurrentUser } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { supplierAdminSchema, supplierSelfEditSchema } from '@/modules/suppliers/schemas';
import { findSupplierByCnpj, getSupplierById } from '@/modules/suppliers/queries';
import { generateTempPassword } from '@/lib/passwords';
import type { Supplier, UserProfile } from '@/types/domain';
import { z } from 'zod';

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* ADMIN: criar / editar expositor                                     */
/* ------------------------------------------------------------------ */

const loginEmailSchema = z.string().email('E-mail de login inválido.').optional().or(z.literal(''));

export type CreateSupplierResult =
  | { ok: true; credentials?: { email: string; tempPassword: string } }
  | { ok: false; error: string };

/**
 * `loginEmail`, quando informado, provisiona também o acesso ao portal:
 * cria o usuário no Firebase Authentication com uma senha temporária
 * forte (nunca gerada no cliente, nunca enviada por e-mail/servidor —
 * só é retornada uma vez, nesta resposta, para o admin copiar e passar
 * ao expositor por fora do sistema) e cria o perfil com
 * `mustChangePassword: true`.
 */
export async function createSupplierAction(eventId: string, raw: unknown, loginEmail?: string): Promise<CreateSupplierResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = supplierAdminSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const data = parsed.data;

  const emailParsed = loginEmailSchema.safeParse(loginEmail ?? '');
  if (!emailParsed.success) return { ok: false, error: emailParsed.error.issues[0]?.message ?? 'E-mail inválido.' };

  if (data.cnpj) {
    const dup = await findSupplierByCnpj(eventId, data.cnpj);
    if (dup) return { ok: false, error: `Já existe um expositor com este CNPJ neste evento: ${dup.nomeFantasia}.` };
  }

  const countSnap = await adminDb().collection(COLLECTIONS.suppliers).where('eventId', '==', eventId).count().get();
  const codigo = `EXP-${String(countSnap.data().count + 1).padStart(3, '0')}`;

  const ref = adminDb().collection(COLLECTIONS.suppliers).doc();
  const now = new Date().toISOString();

  let authUid: string | null = null;
  let tempPassword: string | undefined;
  const email = emailParsed.data;

  if (email) {
    tempPassword = generateTempPassword();
    try {
      const created = await adminAuth().createUser({ email, password: tempPassword, displayName: data.responsavel.nome, emailVerified: true });
      authUid = created.uid;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-exists') return { ok: false, error: 'Já existe um usuário com este e-mail de login.' };
      return { ok: false, error: 'Não foi possível criar o login do expositor.' };
    }
  }

  const supplier: Supplier = {
    id: ref.id, eventId, codigo,
    razaoSocial: data.razaoSocial, nomeFantasia: data.nomeFantasia, cnpj: data.cnpj,
    inscricaoEstadual: data.inscricaoEstadual ?? '', endereco: data.endereco, responsavel: data.responsavel,
    nomeExibido: data.nomeFantasia, standNumero: data.standNumero, standLocalizacao: data.standLocalizacao ?? '',
    standMetragem: data.standMetragem ?? 0, categoria: data.categoria ?? '', observacoesInternas: data.observacoesInternas ?? '',
    statusGeral: 'PENDING', statusCadastral: 'NOT_STARTED', statusDash: 'PENDING_REVIEW', statusFinanceiro: 'NO_CHARGE',
    verifiedAt: null, verifiedBy: null, validatedAt: null, validatedBy: null, authUid,
    createdAt: now, updatedAt: now,
  };
  await ref.set(supplier);

  if (authUid && email) {
    const profile: UserProfile = {
      uid: authUid, email, name: data.responsavel.nome, role: 'EXPOSITOR',
      supplierId: ref.id, eventId, mustChangePassword: true, createdAt: now,
    };
    await adminDb().collection(COLLECTIONS.profiles).doc(authUid).set(profile);
  }

  await addAuditLog({
    eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: ref.id, entityLabel: supplier.nomeFantasia,
    action: 'EXPOSITOR_CRIADO', details: authUid ? 'Expositor cadastrado com acesso ao portal provisionado.' : 'Expositor cadastrado manualmente pelo administrador (sem login).',
  });

  revalidatePath('/admin/expositores');
  revalidatePath('/admin/dashboard');
  return tempPassword && email ? { ok: true, credentials: { email, tempPassword } } : { ok: true };
}

/** Gera uma nova senha temporária para um expositor que já tem login, ou cria o login se ainda não existir. */
export async function resetSupplierPasswordAction(supplierId: string, loginEmail?: string): Promise<CreateSupplierResult> {
  const user = await requireRole('SUPER_ADMIN');
  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const tempPassword = generateTempPassword();
  let authUid = supplier.authUid;
  let email = loginEmail?.trim() || supplier.responsavel.email;

  try {
    if (authUid) {
      const updated = await adminAuth().updateUser(authUid, { password: tempPassword });
      email = updated.email ?? email;
    } else {
      const emailParsed = z.string().email('E-mail de login inválido.').safeParse(email);
      if (!emailParsed.success) return { ok: false, error: emailParsed.error.issues[0]?.message ?? 'E-mail inválido.' };
      const created = await adminAuth().createUser({ email, password: tempPassword, displayName: supplier.responsavel.nome, emailVerified: true });
      authUid = created.uid;
      await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({ authUid });
    }
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-exists') return { ok: false, error: 'Já existe um usuário com este e-mail de login.' };
    return { ok: false, error: 'Não foi possível gerar a nova senha.' };
  }
  if (!authUid) return { ok: false, error: 'Não foi possível gerar a nova senha.' };

  const now = new Date().toISOString();
  await adminDb().collection(COLLECTIONS.profiles).doc(authUid).set(
    { uid: authUid, email, name: supplier.responsavel.nome, role: 'EXPOSITOR', supplierId, eventId: supplier.eventId, mustChangePassword: true, createdAt: now },
    { merge: true },
  );

  await addAuditLog({
    eventId: supplier.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId, entityLabel: supplier.nomeFantasia,
    action: 'STATUS_ALTERADO', details: 'Nova senha temporária gerada pelo administrador.',
  });

  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true, credentials: { email, tempPassword } };
}

export async function updateSupplierAdminAction(supplierId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = supplierAdminSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const data = parsed.data;

  const existing = await getSupplierById(supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };

  if (data.cnpj) {
    const dup = await findSupplierByCnpj(existing.eventId, data.cnpj, supplierId);
    if (dup) return { ok: false, error: `Já existe um expositor com este CNPJ neste evento: ${dup.nomeFantasia}.` };
  }

  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({
    razaoSocial: data.razaoSocial, nomeFantasia: data.nomeFantasia, cnpj: data.cnpj,
    inscricaoEstadual: data.inscricaoEstadual ?? '', endereco: data.endereco, responsavel: data.responsavel,
    standNumero: data.standNumero, standLocalizacao: data.standLocalizacao ?? '', categoria: data.categoria ?? '',
    observacoesInternas: data.observacoesInternas ?? '', standMetragem: data.standMetragem ?? 0,
    updatedAt: new Date().toISOString(),
  });
  await addAuditLog({
    eventId: existing.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: data.nomeFantasia, action: 'EXPOSITOR_EDITADO', details: 'Dados cadastrais atualizados pelo administrador.',
  });

  revalidatePath('/admin/expositores');
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function setSupplierActiveAction(supplierId: string, active: boolean): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const existing = await getSupplierById(supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };

  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({
    statusGeral: active ? 'REGULAR' : 'INACTIVE',
    updatedAt: new Date().toISOString(),
  });
  await addAuditLog({
    eventId: existing.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: existing.nomeFantasia, action: 'STATUS_ALTERADO',
    details: `Status geral alterado para ${active ? 'Regular' : 'Inativo'} (soft delete).`,
  });
  revalidatePath('/admin/expositores');
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* ADMIN: verificação / validação / correção de cadastro                */
/* ------------------------------------------------------------------ */

export async function verifySupplierAction(supplierId: string): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const existing = await getSupplierById(supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };
  const now = new Date().toISOString();
  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({
    statusDash: 'VERIFIED', statusCadastral: 'VERIFIED', verifiedAt: now, verifiedBy: user.name, updatedAt: now,
  });
  await addAuditLog({
    eventId: existing.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: existing.nomeFantasia, action: 'VALIDACAO_REALIZADA', details: 'Cadastro marcado como verificado.',
  });
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function validateSupplierAction(supplierId: string): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const existing = await getSupplierById(supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };
  const now = new Date().toISOString();
  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({
    statusDash: 'VALIDATED', statusCadastral: 'VALIDATED', statusGeral: 'REGULAR',
    validatedAt: now, validatedBy: user.name, updatedAt: now,
  });
  await addAuditLog({
    eventId: existing.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: existing.nomeFantasia, action: 'VALIDACAO_REALIZADA', details: 'Cadastro validado pela DASH.',
  });
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function requestCorrectionAction(supplierId: string): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const existing = await getSupplierById(supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };
  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({
    statusDash: 'REJECTED', statusCadastral: 'NEEDS_CORRECTION', updatedAt: new Date().toISOString(),
  });
  await addAuditLog({
    eventId: existing.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: existing.nomeFantasia, action: 'STATUS_ALTERADO', details: 'Correção de cadastro solicitada ao expositor.',
  });
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* PORTAL: o próprio expositor edita seus dados                        */
/* ------------------------------------------------------------------ */

/**
 * Autoatendimento: o expositor autenticado edita seus próprios dados.
 * A verificação de que ele só altera o PRÓPRIO registro acontece no
 * servidor (user.supplierId), nunca confiando em um id vindo do cliente.
 */
export async function updateSupplierSelfAction(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'EXPOSITOR' || !user.supplierId) {
    return { ok: false, error: 'Sessão inválida.' };
  }
  const parsed = supplierSelfEditSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const data = parsed.data;

  const existing = await getSupplierById(user.supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };

  if (data.cnpj) {
    const dup = await findSupplierByCnpj(existing.eventId, data.cnpj, user.supplierId);
    if (dup) return { ok: false, error: 'Este CNPJ já está em uso por outro expositor neste evento.' };
  }

  // Preencher/editar avança automaticamente o status cadastral, mas nunca
  // pula direto para "verificado" ou "validado" — isso é sempre feito
  // manualmente pela equipe DASH (ver seção 13 da especificação).
  const nextStatusCadastral = existing.statusCadastral === 'NOT_STARTED' ? 'IN_PROGRESS' : existing.statusCadastral;

  await adminDb().collection(COLLECTIONS.suppliers).doc(user.supplierId).update({
    razaoSocial: data.razaoSocial, nomeFantasia: data.nomeFantasia, cnpj: data.cnpj,
    inscricaoEstadual: data.inscricaoEstadual ?? '', endereco: data.endereco, responsavel: data.responsavel,
    standMetragem: data.standMetragem ?? existing.standMetragem ?? 0,
    statusCadastral: nextStatusCadastral,
    updatedAt: new Date().toISOString(),
  });
  await addAuditLog({
    eventId: existing.eventId, userName: `${user.name} (expositor)`, entityType: 'EXPOSITOR', entityId: user.supplierId,
    entityLabel: data.nomeFantasia, action: 'EXPOSITOR_EDITADO', details: 'Expositor atualizou os próprios dados cadastrais pelo portal.',
  });

  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${user.supplierId}`);
  return { ok: true };
}

/** Envio formal do cadastro para análise da DASH (Batch 2, seção "Envio para aprovação"). */
export async function submitSupplierForReviewAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'EXPOSITOR' || !user.supplierId) return { ok: false, error: 'Sessão inválida.' };

  const existing = await getSupplierById(user.supplierId);
  if (!existing) return { ok: false, error: 'Expositor não encontrado.' };
  if (existing.statusCadastral === 'NOT_STARTED') {
    return { ok: false, error: 'Preencha os dados cadastrais antes de enviar para análise.' };
  }

  await adminDb().collection(COLLECTIONS.suppliers).doc(user.supplierId).update({
    statusCadastral: 'SUBMITTED', statusDash: 'PENDING_REVIEW', updatedAt: new Date().toISOString(),
  });
  await addAuditLog({
    eventId: existing.eventId, userName: `${user.name} (expositor)`, entityType: 'EXPOSITOR', entityId: user.supplierId,
    entityLabel: existing.nomeFantasia, action: 'STATUS_ALTERADO', details: 'Expositor enviou o cadastro para análise da DASH.',
  });

  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${user.supplierId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* ADMIN: exclusão definitiva                                          */
/* ------------------------------------------------------------------ */

export interface SupplierDeletionImpact {
  nomeFantasia: string;
  orders: number;
  orderItems: number;
  payments: number;
  paidAmount: number;
  teamMembers: number;
  documents: number;
  hasLogin: boolean;
}

/**
 * Levanta o que será perdido antes de excluir — a interface mostra isso na
 * confirmação para a exclusão nunca ser uma surpresa. Desativar (soft delete)
 * continua existindo e é a opção recomendada quando há histórico financeiro.
 */
export async function getSupplierDeletionImpactAction(supplierId: string): Promise<SupplierDeletionImpact | null> {
  await requireRole('SUPER_ADMIN');
  const supplier = await getSupplierById(supplierId);
  if (!supplier) return null;

  const [ordersSnap, paymentsSnap, teamSnap, docsSnap] = await Promise.all([
    adminDb().collection(COLLECTIONS.orders).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.payments).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.teamMembers).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.documents).where('supplierId', '==', supplierId).get(),
  ]);

  const orders = ordersSnap.docs.map((d) => d.data() as { items?: unknown[] });
  const payments = paymentsSnap.docs.map((d) => d.data() as { status: string; amount: number });

  return {
    nomeFantasia: supplier.nomeFantasia,
    orders: ordersSnap.size,
    orderItems: orders.reduce((sum, o) => sum + (o.items?.length ?? 0), 0),
    payments: paymentsSnap.size,
    paidAmount: payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + (p.amount ?? 0), 0),
    teamMembers: teamSnap.size,
    documents: docsSnap.size,
    hasLogin: Boolean(supplier.authUid),
  };
}

/**
 * Exclusão definitiva do expositor e de tudo que depende dele: pedidos,
 * pagamentos, equipe, documentos, o usuário do Firebase Auth e o perfil.
 *
 * O log de auditoria é mantido de propósito — é o registro de que a exclusão
 * aconteceu, e apagá-lo derrotaria o próprio propósito da auditoria.
 *
 * `confirmationName` precisa bater com o nome fantasia: evita exclusão por
 * clique errado numa lista.
 */
export async function deleteSupplierAction(supplierId: string, confirmationName: string): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  if (confirmationName.trim().toLowerCase() !== supplier.nomeFantasia.trim().toLowerCase()) {
    return { ok: false, error: 'O nome digitado não confere com o nome fantasia do expositor.' };
  }

  const [ordersSnap, paymentsSnap, teamSnap, docsSnap] = await Promise.all([
    adminDb().collection(COLLECTIONS.orders).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.payments).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.teamMembers).where('supplierId', '==', supplierId).get(),
    adminDb().collection(COLLECTIONS.documents).where('supplierId', '==', supplierId).get(),
  ]);

  const batch = adminDb().batch();
  [...ordersSnap.docs, ...paymentsSnap.docs, ...teamSnap.docs, ...docsSnap.docs].forEach((d) => batch.delete(d.ref));
  if (supplier.authUid) batch.delete(adminDb().collection(COLLECTIONS.profiles).doc(supplier.authUid));
  batch.delete(adminDb().collection(COLLECTIONS.suppliers).doc(supplierId));
  await batch.commit();

  if (supplier.authUid) {
    // Se o usuário já tiver sido removido no console do Firebase, seguimos em frente.
    try { await adminAuth().deleteUser(supplier.authUid); } catch { /* noop */ }
  }

  await addAuditLog({
    eventId: supplier.eventId, userName: user.name, entityType: 'EXPOSITOR', entityId: supplierId,
    entityLabel: supplier.nomeFantasia, action: 'EXPOSITOR_EXCLUIDO',
    details: `Exclusão definitiva: ${ordersSnap.size} pedido(s), ${paymentsSnap.size} pagamento(s), ${teamSnap.size} integrante(s) e ${docsSnap.size} documento(s) removidos.`,
  });

  revalidatePath('/admin/expositores');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}
