'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { catalogItemSchema, importRowSchema, type ImportRow } from '@/modules/catalog/schemas';
import { findCatalogItemByCode, listCatalogItemsByEvent } from '@/modules/catalog/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { CatalogItem } from '@/types/domain';

export async function createCatalogItemAction(eventId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const data = parsed.data;

  const dup = await findCatalogItemByCode(eventId, data.code);
  if (dup) return { ok: false, error: `Já existe um item com o código ${data.code} neste evento.` };

  const ref = adminDb().collection(COLLECTIONS.catalogItems).doc();
  const now = new Date().toISOString();
  const item: CatalogItem = {
    id: ref.id, eventId, ...data, allowsQuantity: true, availableAfterDeadline: true, specificDeadline: null,
    createdAt: now, updatedAt: now, createdBy: user.name, updatedBy: user.name,
  };
  await ref.set(item);
  await addAuditLog({
    eventId, userName: user.name, entityType: 'ITEM_CATALOGO', entityId: ref.id, entityLabel: item.name,
    action: 'ITEM_CRIADO', details: `Item ${item.code} cadastrado manualmente.`,
  });
  revalidatePath('/admin/catalogo');
  return { ok: true };
}

export async function updateCatalogItemAction(itemId: string, eventId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const data = parsed.data;

  const dup = await findCatalogItemByCode(eventId, data.code, itemId);
  if (dup) return { ok: false, error: `Já existe um item com o código ${data.code} neste evento.` };

  const ref = adminDb().collection(COLLECTIONS.catalogItems).doc(itemId);
  const before = (await ref.get()).data() as CatalogItem | undefined;
  await ref.update({ ...data, updatedAt: new Date().toISOString(), updatedBy: user.name });

  const priceChanged = before && before.price !== data.price;
  await addAuditLog({
    eventId, userName: user.name, entityType: 'ITEM_CATALOGO', entityId: itemId, entityLabel: data.name,
    action: priceChanged ? 'PRECO_ALTERADO' : 'ITEM_EDITADO',
    details: priceChanged
      ? `Preço alterado de R$ ${before?.price.toFixed(2)} para R$ ${data.price.toFixed(2)}.`
      : 'Item de catálogo atualizado.',
  });
  revalidatePath('/admin/catalogo');
  return { ok: true };
}

export async function bulkSetCatalogActiveAction(eventId: string, ids: string[], active: boolean): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const batch = adminDb().batch();
  ids.forEach((id) => {
    batch.update(adminDb().collection(COLLECTIONS.catalogItems).doc(id), { active, updatedAt: new Date().toISOString() });
  });
  await batch.commit();
  await addAuditLog({
    eventId, userName: user.name, entityType: 'ITEM_CATALOGO', entityLabel: `${ids.length} itens`,
    action: 'ITEM_EDITADO', details: `Ação em massa: ${active ? 'ativação' : 'desativação'} de ${ids.length} item(ns).`,
  });
  revalidatePath('/admin/catalogo');
  return { ok: true };
}

export interface ImportDiffRow {
  row: ImportRow;
  situation: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR';
  existing?: CatalogItem;
  error?: string;
}

export interface ImportPreview {
  total: number;
  novos: number;
  atualizados: number;
  semAlteracao: number;
  comErro: number;
  rows: ImportDiffRow[];
}

/** Etapa de validação + preview (não grava nada ainda). */
export async function previewCatalogImportAction(eventId: string, rawRows: unknown[]): Promise<ImportPreview> {
  await requireRole('SUPER_ADMIN');
  const existingItems = await listCatalogItemsByEvent(eventId);
  const existingByCode = new Map(existingItems.map((i) => [i.code.toUpperCase(), i]));
  const seenCodes = new Set<string>();

  const rows: ImportDiffRow[] = rawRows.map((raw) => {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      return { row: raw as ImportRow, situation: 'ERROR', error: parsed.error.issues[0]?.message ?? 'Linha inválida.' };
    }
    const row = parsed.data;
    const code = row.code.trim().toUpperCase();
    if (seenCodes.has(code)) {
      return { row, situation: 'ERROR', error: `Código ${code} duplicado dentro da própria planilha.` };
    }
    seenCodes.add(code);

    const existing = existingByCode.get(code);
    if (!existing) return { row, situation: 'NEW' };

    const changed =
      existing.name !== row.name || existing.price !== row.price || existing.category !== row.category ||
      existing.billingUnit !== row.billing_unit || existing.active !== row.active;
    return { row, situation: changed ? 'UPDATED' : 'UNCHANGED', existing };
  });

  return {
    total: rows.length,
    novos: rows.filter((r) => r.situation === 'NEW').length,
    atualizados: rows.filter((r) => r.situation === 'UPDATED').length,
    semAlteracao: rows.filter((r) => r.situation === 'UNCHANGED').length,
    comErro: rows.filter((r) => r.situation === 'ERROR').length,
    rows,
  };
}

/** Etapa de confirmação: aplica de fato as mudanças validadas no preview. */
export async function applyCatalogImportAction(eventId: string, filename: string, preview: ImportPreview): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  if (preview.comErro > 0) return { ok: false, error: 'A importação contém linhas com erro e não pode ser aplicada.' };

  const batch = adminDb().batch();
  const now = new Date().toISOString();

  for (const diff of preview.rows) {
    if (diff.situation === 'UNCHANGED') continue;
    const row = diff.row;
    if (diff.situation === 'NEW') {
      const ref = adminDb().collection(COLLECTIONS.catalogItems).doc();
      const item: CatalogItem = {
        id: ref.id, eventId, code: row.code.toUpperCase(), name: row.name, description: row.description,
        category: row.category, price: row.price, billingUnit: row.billing_unit,
        minQty: row.minimum_quantity, maxQty: row.maximum_quantity, allowsQuantity: row.allows_quantity,
        requiresApproval: row.requires_dash_approval, active: row.active,
        createdAt: now, updatedAt: now, createdBy: user.name, updatedBy: user.name,
      };
      batch.set(ref, item);
    } else if (diff.situation === 'UPDATED' && diff.existing) {
      batch.update(adminDb().collection(COLLECTIONS.catalogItems).doc(diff.existing.id), {
        name: row.name, price: row.price, category: row.category, billingUnit: row.billing_unit,
        minQty: row.minimum_quantity, maxQty: row.maximum_quantity, requiresApproval: row.requires_dash_approval,
        active: row.active, updatedAt: now, updatedBy: user.name,
      });
    }
  }

  const importRef = adminDb().collection(COLLECTIONS.catalogImports).doc();
  batch.set(importRef, {
    id: importRef.id, eventId, filename, version: 1, status: 'APPLIED',
    recordsTotal: preview.total, recordsCreated: preview.novos, recordsUpdated: preview.atualizados,
    recordsUnchanged: preview.semAlteracao, recordsFailed: preview.comErro,
    createdBy: user.name, createdAt: now,
  });

  await batch.commit();
  await addAuditLog({
    eventId, userName: user.name, entityType: 'IMPORTACAO', entityLabel: filename, action: 'IMPORTACAO_EXECUTADA',
    details: `Importação aplicada: ${preview.novos} novos, ${preview.atualizados} atualizados, ${preview.semAlteracao} sem alteração.`,
  });
  revalidatePath('/admin/catalogo');
  return { ok: true };
}
