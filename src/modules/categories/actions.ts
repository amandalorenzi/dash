'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole } from '@/lib/auth/session';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { CategoryKind } from '@/modules/categories/queries';

export async function createCategoryAction(eventId: string, name: string, kind: CategoryKind): Promise<ActionResult> {
  await requireRole('SUPER_ADMIN');
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Informe um nome.' };

  const id = `${eventId}-${kind}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
  const existing = await adminDb().collection(COLLECTIONS.categories).doc(id).get();
  if (existing.exists) return { ok: false, error: `Já existe uma categoria "${trimmed}" nesse grupo.` };

  await adminDb().collection(COLLECTIONS.categories).doc(id).set({ id, eventId, name: trimmed, kind });
  revalidatePath('/admin/categorias');
  revalidatePath('/admin/expositores');
  revalidatePath('/admin/catalogo');
  return { ok: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  await requireRole('SUPER_ADMIN');
  await adminDb().collection(COLLECTIONS.categories).doc(categoryId).delete();
  revalidatePath('/admin/categorias');
  revalidatePath('/admin/expositores');
  revalidatePath('/admin/catalogo');
  return { ok: true };
}
