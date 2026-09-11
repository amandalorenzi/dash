'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole, getCurrentUser } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { getSupplierById } from '@/modules/suppliers/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { CatalogItem, OrderItem, SupplierOrder } from '@/types/domain';

async function getOrCreateDraftOrder(eventId: string, supplierId: string): Promise<SupplierOrder> {
  const snap = await adminDb()
    .collection(COLLECTIONS.orders)
    .where('supplierId', '==', supplierId)
    .where('status', 'in', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'])
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].data() as SupplierOrder;

  const ref = adminDb().collection(COLLECTIONS.orders).doc();
  const now = new Date().toISOString();
  const order: SupplierOrder = { id: ref.id, eventId, supplierId, status: 'SUBMITTED', items: [], createdAt: now, updatedAt: now };
  await ref.set(order);
  return order;
}

async function appendOrderItem(order: SupplierOrder, catalogItem: CatalogItem, quantity: number, notes: string) {
  const item: OrderItem = {
    id: adminDb().collection('_').doc().id, catalogItemId: catalogItem.id, codeSnapshot: catalogItem.code,
    nameSnapshot: catalogItem.name, unitSnapshot: catalogItem.billingUnit, unitPriceSnapshot: catalogItem.price,
    quantity, approvalStatus: 'PENDING', notes,
  };
  await adminDb().collection(COLLECTIONS.orders).doc(order.id).update({
    items: [...order.items, item], updatedAt: new Date().toISOString(),
  });
  return item;
}

/** ADMIN registra manualmente um pedido feito por telefone/WhatsApp/presencial. */
export async function addManualOrderItemAction(supplierId: string, catalogItemId: string, quantity: number, notes: string): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };
  if (quantity < 1) return { ok: false, error: 'Quantidade deve ser maior que zero.' };

  const itemDoc = await adminDb().collection(COLLECTIONS.catalogItems).doc(catalogItemId).get();
  if (!itemDoc.exists) return { ok: false, error: 'Item de catálogo não encontrado.' };
  const catalogItem = itemDoc.data() as CatalogItem;

  const order = await getOrCreateDraftOrder(supplier.eventId, supplierId);
  await appendOrderItem(order, catalogItem, quantity, notes);
  await addAuditLog({
    eventId: supplier.eventId, userName: user.name, entityType: 'ITEM_CATALOGO', entityId: catalogItem.id,
    entityLabel: `${catalogItem.name} · ${supplier.nomeFantasia}`, action: 'ITEM_CRIADO',
    details: `Item adicionado manualmente pelo administrador (qtd. ${quantity}).`,
  });
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

/** EXPOSITOR solicita um extra pelo próprio portal. */
export async function requestOrderItemAction(catalogItemId: string, quantity: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'EXPOSITOR' || !user.supplierId) return { ok: false, error: 'Sessão inválida.' };
  if (quantity < 1) return { ok: false, error: 'Quantidade deve ser maior que zero.' };

  const supplier = await getSupplierById(user.supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const itemDoc = await adminDb().collection(COLLECTIONS.catalogItems).doc(catalogItemId).get();
  if (!itemDoc.exists || !(itemDoc.data() as CatalogItem).active) return { ok: false, error: 'Item indisponível.' };
  const catalogItem = itemDoc.data() as CatalogItem;

  const order = await getOrCreateDraftOrder(supplier.eventId, supplier.id);
  await appendOrderItem(order, catalogItem, quantity, 'Solicitado pelo expositor via portal.');
  await addAuditLog({
    eventId: supplier.eventId, userName: `${user.name} (expositor)`, entityType: 'ITEM_CATALOGO', entityId: catalogItem.id,
    entityLabel: `${catalogItem.name} · ${supplier.nomeFantasia}`, action: 'ITEM_CRIADO',
    details: `Expositor solicitou ${quantity}x ${catalogItem.name}.`,
  });
  revalidatePath('/portal');
  revalidatePath(`/admin/expositores/${supplier.id}`);
  return { ok: true };
}

export async function approveOrderItemAction(orderId: string, itemId: string, approve: boolean): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const ref = adminDb().collection(COLLECTIONS.orders).doc(orderId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'Pedido não encontrado.' };
  const order = doc.data() as SupplierOrder;

  const items = order.items.map((it) => (it.id === itemId ? { ...it, approvalStatus: approve ? 'APPROVED' as const : 'REJECTED' as const } : it));
  const allDecided = items.every((it) => it.approvalStatus !== 'PENDING');
  const anyApproved = items.some((it) => it.approvalStatus === 'APPROVED');
  const status = allDecided ? (anyApproved ? 'APPROVED' : 'REJECTED') : order.status;

  await ref.update({ items, status, updatedAt: new Date().toISOString() });

  const supplier = await getSupplierById(order.supplierId);
  const item = items.find((it) => it.id === itemId);
  await addAuditLog({
    eventId: order.eventId, userName: user.name, entityType: 'ITEM_CATALOGO', entityId: itemId,
    entityLabel: `${item?.nameSnapshot ?? ''} · ${supplier?.nomeFantasia ?? ''}`, action: 'STATUS_ALTERADO',
    details: `Item ${approve ? 'aprovado' : 'rejeitado'} pela DASH.`,
  });
  revalidatePath(`/admin/expositores/${order.supplierId}`);
  revalidatePath('/portal');
  return { ok: true };
}
