'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole, getCurrentUser } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { getSupplierById } from '@/modules/suppliers/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { SupplierDocument, DocumentStatus } from '@/types/domain';
import { z } from 'zod';

/**
 * Nesta primeira versão o "upload" grava apenas metadados do documento
 * (nome do arquivo, tipo). A integração com Firebase Storage para o
 * binário em si fica marcada como próximo passo em docs/BATCH-01-DELIVERY.md —
 * o modelo de dados já está pronto para receber uma `storagePath` quando
 * isso for implementado, sem qualquer mudança de schema.
 */
const documentSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do arquivo.'),
  tipo: z.string().min(1, 'Selecione o tipo de documento.'),
});

export async function listDocuments(supplierId: string): Promise<SupplierDocument[]> {
  const snap = await adminDb().collection(COLLECTIONS.documents).where('supplierId', '==', supplierId).get();
  return snap.docs.map((d) => d.data() as SupplierDocument);
}

export async function addDocumentAction(supplierId: string, raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Sessão inválida.' };
  if (user.role === 'EXPOSITOR' && user.supplierId !== supplierId) return { ok: false, error: 'Não autorizado.' };

  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const ref = adminDb().collection(COLLECTIONS.documents).doc();
  const doc: SupplierDocument = {
    id: ref.id, eventId: supplier.eventId, supplierId, nome: parsed.data.nome, tipo: parsed.data.tipo,
    status: 'PENDING_REVIEW', uploadedAt: new Date().toISOString(), reviewedAt: null, reviewedBy: null,
  };
  await ref.set(doc);
  await addAuditLog({
    eventId: supplier.eventId, userName: user.role === 'EXPOSITOR' ? `${user.name} (expositor)` : user.name,
    entityType: 'DOCUMENTO', entityId: ref.id, entityLabel: `${doc.nome} · ${supplier.nomeFantasia}`,
    action: 'ITEM_CRIADO', details: `Documento "${doc.nome}" (${doc.tipo}) enviado.`,
  });
  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function reviewDocumentAction(documentId: string, status: DocumentStatus): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const ref = adminDb().collection(COLLECTIONS.documents).doc(documentId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'Documento não encontrado.' };
  const data = doc.data() as SupplierDocument;

  await ref.update({ status, reviewedAt: new Date().toISOString(), reviewedBy: user.name });
  await addAuditLog({
    eventId: data.eventId, userName: user.name, entityType: 'DOCUMENTO', entityId: documentId, entityLabel: data.nome,
    action: 'STATUS_ALTERADO', details: `Documento ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'} pela DASH.`,
  });
  revalidatePath(`/admin/expositores/${data.supplierId}`);
  revalidatePath('/portal');
  return { ok: true };
}
