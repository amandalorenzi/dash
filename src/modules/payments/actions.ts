'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { requireRole } from '@/lib/auth/session';
import { addAuditLog } from '@/modules/audit/log';
import { getSupplierById } from '@/modules/suppliers/queries';
import type { ActionResult } from '@/modules/suppliers/actions';
import type { Payment, PaymentStatus } from '@/types/domain';
import { z } from 'zod';

const paymentSchema = z.object({
  amount: z.coerce.number().min(0, 'O valor não pode ser negativo.'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function registerPaymentAction(supplierId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const supplier = await getSupplierById(supplierId);
  if (!supplier) return { ok: false, error: 'Expositor não encontrado.' };

  const ref = adminDb().collection(COLLECTIONS.payments).doc();
  const payment: Payment = {
    id: ref.id, eventId: supplier.eventId, supplierId, orderId: null, amount: parsed.data.amount,
    status: 'PAYMENT_PENDING', paymentMethod: parsed.data.paymentMethod || null, reference: parsed.data.reference || null,
    notes: parsed.data.notes ?? '', paidAt: null, verifiedAt: null, verifiedBy: null, createdAt: new Date().toISOString(),
  };
  await ref.set(payment);
  await adminDb().collection(COLLECTIONS.suppliers).doc(supplierId).update({ statusFinanceiro: 'PAYMENT_PENDING' });
  await addAuditLog({
    eventId: supplier.eventId, userName: user.name, entityType: 'PAGAMENTO', entityId: ref.id, entityLabel: supplier.nomeFantasia,
    action: 'PAGAMENTO_ALTERADO', details: `Pagamento de R$ ${parsed.data.amount.toFixed(2)} registrado.`,
  });
  revalidatePath(`/admin/expositores/${supplierId}`);
  return { ok: true };
}

export async function updatePaymentStatusAction(paymentId: string, status: PaymentStatus): Promise<ActionResult> {
  const user = await requireRole('SUPER_ADMIN');
  const ref = adminDb().collection(COLLECTIONS.payments).doc(paymentId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: 'Pagamento não encontrado.' };
  const payment = doc.data() as Payment;

  const now = new Date().toISOString();
  await ref.update({
    status,
    paidAt: status === 'PAID' ? now : payment.paidAt,
    verifiedAt: status === 'PAID' ? now : payment.verifiedAt,
    verifiedBy: status === 'PAID' ? user.name : payment.verifiedBy,
  });

  const supplier = await getSupplierById(payment.supplierId);
  if (supplier) await adminDb().collection(COLLECTIONS.suppliers).doc(supplier.id).update({ statusFinanceiro: status });

  await addAuditLog({
    eventId: payment.eventId, userName: user.name, entityType: 'PAGAMENTO', entityId: paymentId, entityLabel: supplier?.nomeFantasia ?? '',
    action: 'PAGAMENTO_ALTERADO', details: `Status do pagamento alterado para ${status}.`,
  });
  revalidatePath(`/admin/expositores/${payment.supplierId}`);
  return { ok: true };
}
