'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole, getCurrentUser } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { FirestoreEvent, EventUpdate } from '@/types/domain';
import { z } from 'zod';

const eventSchema = z.object({
  name: z.string().min(2, 'Informe o nome do evento.'),
  local: z.string().optional().transform((v) => v ?? ''),
  dataInicio: z.string().min(1, 'Informe a data de início.'),
  dataFim: z.string().min(1, 'Informe a data de término.'),
  endereco: z.object({
    logradouro: z.string().optional().transform((v) => v ?? ''),
    numero: z.string().optional().transform((v) => v ?? ''),
    bairro: z.string().optional().transform((v) => v ?? ''),
    cidade: z.string().optional().transform((v) => v ?? ''),
    estado: z.string().optional().transform((v) => (v ?? '').toUpperCase()),
    cep: z.string().optional().transform((v) => v ?? ''),
  }),
  orderDeadline: z.string().optional().transform((v) => v || null),
  guideContent: z.string().optional().transform((v) => v ?? ''),
}).refine((d) => d.dataFim >= d.dataInicio, {
  message: 'A data de término não pode ser anterior à data de início.',
  path: ['dataFim'],
});

export async function createEventAction(raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const ref = adminDb().collection(COLLECTIONS.events).doc();
  const event: FirestoreEvent = {
    id: ref.id, ...parsed.data, sharedDocuments: [], createdAt: new Date().toISOString(),
  };
  await ref.set(event);

  // Categorias iniciais para o evento novo não ficar vazio — criadas aqui,
  // pela própria interface, sem depender de script de seed local.
  const batch = adminDb().batch();
  const itemCategories = ['Mobiliário', 'Elétrica', 'Audiovisual', 'Internet', 'Limpeza', 'Staff', 'Outros'];
  const supplierCategories = ['Patrocinador', 'Expositor', 'Apoio', 'Outros'];
  for (const name of itemCategories) {
    const id = `${ref.id}-ITEM-${name.toLowerCase().replace(/\s+/g, '-')}`;
    batch.set(adminDb().collection(COLLECTIONS.categories).doc(id), { id, eventId: ref.id, name, kind: 'ITEM' });
  }
  for (const name of supplierCategories) {
    const id = `${ref.id}-SUPPLIER-${name.toLowerCase().replace(/\s+/g, '-')}`;
    batch.set(adminDb().collection(COLLECTIONS.categories).doc(id), { id, eventId: ref.id, name, kind: 'SUPPLIER' });
  }
  await batch.commit();

  await addAuditLog({
    eventId: ref.id, userName: user.name, entityType: 'EVENTO', entityId: ref.id, entityLabel: event.name,
    action: 'EVENTO_CRIADO', details: 'Evento criado com categorias iniciais.',
  });
  revalidatePath('/admin/eventos');
  return { ok: true };
}

export async function updateEventAction(eventId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  await adminDb().collection(COLLECTIONS.events).doc(eventId).update({ ...parsed.data });
  await addAuditLog({
    eventId, userName: user.name, entityType: 'EVENTO', entityId: eventId, entityLabel: parsed.data.name,
    action: 'EVENTO_EDITADO', details: 'Configuração do evento atualizada.',
  });
  revalidatePath('/admin/eventos');
  revalidatePath('/portal');
  return { ok: true };
}

const sharedDocSchema = z.object({
  name: z.string().min(1, 'Informe o nome do documento.'),
  url: z.string().url('Informe um link válido (começando com https://).'),
});

/**
 * Documentos compartilhados pela DASH são cadastrados como nome + link
 * (Drive, Dropbox, etc.), não como upload de arquivo — isso mantém tudo
 * configurável pela interface, sem depender do Firebase Storage.
 */
export async function addSharedDocumentAction(eventId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = sharedDocSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const ref = adminDb().collection(COLLECTIONS.events).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Evento não encontrado.' };
  const event = snap.data() as FirestoreEvent;

  const docs = [...(event.sharedDocuments ?? []), { id: adminDb().collection('_').doc().id, ...parsed.data }];
  await ref.update({ sharedDocuments: docs });
  await addAuditLog({
    eventId, userName: user.name, entityType: 'EVENTO', entityId: eventId, entityLabel: event.name,
    action: 'EVENTO_EDITADO', details: `Documento compartilhado adicionado: ${parsed.data.name}.`,
  });
  revalidatePath('/admin/eventos');
  revalidatePath('/portal');
  return { ok: true };
}

export async function removeSharedDocumentAction(eventId: string, docId: string): Promise<ActionResult> {
  await requireRole('SUPER_ADMIN');
  const ref = adminDb().collection(COLLECTIONS.events).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Evento não encontrado.' };
  const event = snap.data() as FirestoreEvent;
  await ref.update({ sharedDocuments: (event.sharedDocuments ?? []).filter((d) => d.id !== docId) });
  revalidatePath('/admin/eventos');
  revalidatePath('/portal');
  return { ok: true };
}

/* ------------------------- Updates do evento (mural) ------------------------- */

export async function publishEventUpdateAction(eventId: string, message: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !['SUPER_ADMIN', 'PRODUCAO', 'FINANCEIRO', 'OPERACIONAL'].includes(user.role)) {
    return { ok: false, error: 'Não autorizado.' };
  }
  const trimmed = message.trim();
  if (trimmed.length < 2) return { ok: false, error: 'Escreva uma mensagem.' };
  if (trimmed.length > 2000) return { ok: false, error: 'Mensagem muito longa (máximo 2000 caracteres).' };

  const ref = adminDb().collection(COLLECTIONS.eventUpdates).doc();
  const update: EventUpdate = {
    id: ref.id, eventId, authorName: user.name, message: trimmed, createdAt: new Date().toISOString(),
  };
  await ref.set(update);
  await addAuditLog({
    eventId, userName: user.name, entityType: 'EVENTO', entityId: eventId, entityLabel: 'Updates do evento',
    action: 'UPDATE_PUBLICADO', details: 'Novo comunicado publicado para os expositores.',
  });
  revalidatePath('/admin/dashboard');
  revalidatePath('/portal');
  return { ok: true };
}

export async function deleteEventUpdateAction(updateId: string): Promise<ActionResult> {
  await requireRole('SUPER_ADMIN');
  await adminDb().collection(COLLECTIONS.eventUpdates).doc(updateId).delete();
  revalidatePath('/admin/dashboard');
  revalidatePath('/portal');
  return { ok: true };
}
