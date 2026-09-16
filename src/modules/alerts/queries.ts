import 'server-only';
import { listSuppliersByEvent } from '@/modules/suppliers/queries';
import { listOrdersByEvent } from '@/modules/orders/queries';
import { listPaymentsByEvent } from '@/modules/payments/queries';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/config/firestore-collections';
import { calculateOrderItemTotal } from '@/modules/orders/calculations';
import { fmtMoney } from '@/utils/format';
import type { TeamMember, SupplierDocument, DiscussionMessage } from '@/types/domain';

export interface AdminAlert {
  id: string;
  type: 'CADASTRO' | 'EXTRA' | 'EQUIPE' | 'DOCUMENTO' | 'PAGAMENTO' | 'DISCUSSAO';
  title: string;
  detail: string;
  supplierName: string;
  createdAt: string;
  href: string;
}

/**
 * Alertas são SEMPRE calculados a partir do estado atual dos dados —
 * nenhum registro próprio de "notificação" é gravado. Isso garante que um
 * alerta some sozinho assim que a pendência que o gerou é resolvida
 * (item aprovado, documento revisado, mensagem lida, etc.), sem precisar
 * de nenhuma rotina para "limpar" notificações antigas.
 */
export async function getAdminAlerts(eventId: string): Promise<AdminAlert[]> {
  const [suppliers, orders, payments, teamSnap, docsSnap, discussionSnap] = await Promise.all([
    listSuppliersByEvent(eventId),
    listOrdersByEvent(eventId),
    listPaymentsByEvent(eventId),
    adminDb().collection(COLLECTIONS.teamMembers).where('eventId', '==', eventId).get(),
    adminDb().collection(COLLECTIONS.documents).where('eventId', '==', eventId).get(),
    adminDb().collection(COLLECTIONS.discussions).where('eventId', '==', eventId).get(),
  ]);

  const team = teamSnap.docs.map((d) => d.data() as TeamMember);
  const documents = docsSnap.docs.map((d) => d.data() as SupplierDocument);
  const discussion = discussionSnap.docs.map((d) => d.data() as DiscussionMessage);
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.nomeFantasia ?? 'Expositor';

  const alerts: AdminAlert[] = [];

  suppliers
    .filter((s) => s.statusCadastral === 'SUBMITTED' || ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(s.statusDash))
    .forEach((s) => {
      alerts.push({
        id: `cadastro-${s.id}`, type: 'CADASTRO', title: 'Cadastro aguardando análise',
        detail: `${s.nomeFantasia} enviou o cadastro para validação.`, supplierName: s.nomeFantasia,
        createdAt: s.updatedAt, href: `/admin/expositores/${s.id}?tab=cadastro`,
      });
    });

  orders.forEach((o) => {
    o.items.filter((it) => it.approvalStatus === 'PENDING').forEach((it) => {
      alerts.push({
        id: `extra-${it.id}`, type: 'EXTRA', title: 'Item extra aguardando aprovação',
        detail: `${it.nameSnapshot} (qtd. ${it.quantity}) · ${fmtMoney(calculateOrderItemTotal(it))}`,
        supplierName: supplierName(o.supplierId), createdAt: o.updatedAt, href: `/admin/expositores/${o.supplierId}?tab=extras`,
      });
    });
  });

  team.filter((m) => (m.status ?? 'PENDING') === 'PENDING').forEach((m) => {
    alerts.push({
      id: `equipe-${m.id}`, type: 'EQUIPE', title: 'Integrante de equipe aguardando aprovação',
      detail: `${m.nome} · ${m.cargo}`, supplierName: supplierName(m.supplierId),
      createdAt: m.createdAt, href: `/admin/expositores/${m.supplierId}?tab=equipe`,
    });
  });

  documents.filter((d) => d.status === 'PENDING_REVIEW').forEach((d) => {
    alerts.push({
      id: `doc-${d.id}`, type: 'DOCUMENTO', title: 'Documento aguardando análise',
      detail: `${d.nome} (${d.tipo})`, supplierName: supplierName(d.supplierId),
      createdAt: d.uploadedAt, href: `/admin/expositores/${d.supplierId}?tab=documentos`,
    });
  });

  payments.filter((p) => ['PAYMENT_REPORTED', 'PAYMENT_UNDER_REVIEW'].includes(p.status)).forEach((p) => {
    alerts.push({
      id: `pag-${p.id}`, type: 'PAGAMENTO', title: 'Pagamento aguardando confirmação',
      detail: fmtMoney(p.amount), supplierName: supplierName(p.supplierId),
      createdAt: p.createdAt, href: `/admin/expositores/${p.supplierId}?tab=pagamentos`,
    });
  });

  // Uma mensagem por expositor: só quando a ÚLTIMA mensagem da thread veio do lado do expositor
  // (ou seja, a DASH ainda não respondeu). Assim que a DASH responde, o alerta some.
  const lastBySupplier = new Map<string, DiscussionMessage>();
  discussion.forEach((m) => {
    const current = lastBySupplier.get(m.supplierId);
    if (!current || m.createdAt > current.createdAt) lastBySupplier.set(m.supplierId, m);
  });
  lastBySupplier.forEach((m) => {
    if (m.authorSide !== 'EXPOSITOR') return;
    alerts.push({
      id: `discussao-${m.supplierId}`, type: 'DISCUSSAO', title: 'Nova mensagem na discussão',
      detail: m.message.slice(0, 120), supplierName: supplierName(m.supplierId),
      createdAt: m.createdAt, href: `/admin/expositores/${m.supplierId}?tab=discussao`,
    });
  });

  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
