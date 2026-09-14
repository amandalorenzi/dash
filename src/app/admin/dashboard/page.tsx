import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { getEventById } from '@/modules/events/queries';
import { listSuppliersByEvent, suppliersNeedingAttention } from '@/modules/suppliers/queries';
import { listOrdersByEvent } from '@/modules/orders/queries';
import { listPaymentsByEvent } from '@/modules/payments/queries';
import { listEventUpdates } from '@/modules/events/queries';
import { EventUpdatesFeed } from '@/components/shared/EventUpdatesFeed';
import { calculateOrderTotal, calculateOrderApprovedTotal, calculateSupplierBalance } from '@/modules/orders/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, EmptyState } from '@/components/ui/Badge';
import { STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, STATUS_FINANCEIRO_LABEL } from '@/config/labels';
import { fmtMoney } from '@/utils/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();

  if (!eventId) {
    return (
      <AppShell active="dashboard" user={user}>
        <EmptyState icon="📅" title="Nenhum evento cadastrado" text="Crie o primeiro evento para começar. As categorias iniciais são criadas junto, automaticamente." />
        <div style={{ textAlign: 'center' }}>
          <Link href="/admin/eventos" className="btn btn-primary">Criar primeiro evento</Link>
        </div>
      </AppShell>
    );
  }

  const [event, suppliers, orders, payments, updates] = await Promise.all([
    getEventById(eventId),
    listSuppliersByEvent(eventId),
    listOrdersByEvent(eventId),
    listPaymentsByEvent(eventId),
    listEventUpdates(eventId),
  ]);

  const cadastrosPendentes = suppliers.filter((s) => ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION'].includes(s.statusCadastral)).length;
  const aguardandoValidacao = suppliers.filter((s) => ['PENDING_REVIEW', 'UNDER_REVIEW'].includes(s.statusDash)).length;
  const solicitacoesPendentes = orders.filter((o) => ['SUBMITTED', 'UNDER_REVIEW'].includes(o.status)).length;
  const totalExtras = orders.reduce((sum, o) => sum + calculateOrderTotal(o), 0);
  const totalAprovado = orders.reduce((sum, o) => sum + calculateOrderApprovedTotal(o), 0);
  const totalPago = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const pagamentosPendentes = payments.filter((p) => ['PAYMENT_PENDING', 'PAYMENT_REPORTED', 'PAYMENT_UNDER_REVIEW', 'OVERDUE'].includes(p.status)).length;

  const attention = suppliersNeedingAttention(suppliers);

  const cards = [
    { label: 'Expositores totais', value: String(suppliers.length), hint: 'cadastrados neste evento' },
    { label: 'Cadastros pendentes', value: String(cadastrosPendentes), hint: 'incompletos ou em correção' },
    { label: 'Aguardando validação DASH', value: String(aguardandoValidacao), hint: 'aguardando análise da equipe' },
    { label: 'Solicitações pendentes', value: String(solicitacoesPendentes), hint: 'pedidos enviados ou em análise' },
    { label: 'Pagamentos pendentes', value: String(pagamentosPendentes), hint: 'aguardando, informado ou em verificação' },
    { label: 'Total em extras solicitados', value: fmtMoney(totalExtras), hint: 'soma de todos os pedidos' },
    { label: 'Total aprovado', value: fmtMoney(totalAprovado), hint: 'itens aprovados pela DASH', accent: 'accent-pink' },
    { label: 'Total pago', value: fmtMoney(totalPago), hint: 'pagamentos confirmados', accent: 'accent-success' },
  ];

  return (
    <AppShell active="dashboard" user={user}>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral de {event?.name ?? 'evento selecionado'}, com dados vindos diretamente do Firestore.</p>
        </div>
        <div className="page-actions">
          <Link href="/admin/expositores" className="btn btn-secondary">Ver expositores</Link>
          <Link href="/admin/catalogo" className="btn btn-primary">Gerenciar catálogo</Link>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.accent ?? ''}`}>
            <div className="label">{c.label}</div>
            <div className="value">{c.value}</div>
            <div className="hint">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="mb-16">
        <EventUpdatesFeed eventId={eventId} updates={updates} canPublish canDelete />
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600 }}>Expositores que precisam de atenção</h3>
          <span className="text-sm text-muted">{attention.length} de {suppliers.length} expositores</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Expositor</th><th>Cadastral</th><th>DASH</th><th>Financeiro</th><th>Saldo pendente</th></tr>
            </thead>
            <tbody>
              {attention.length === 0 && (
                <tr><td colSpan={5}><EmptyState icon="✅" title="Tudo em dia" text="Nenhum expositor precisa de atenção no momento." /></td></tr>
              )}
              {attention.map((s) => {
                const supplierOrders = orders.filter((o) => o.supplierId === s.id);
                const supplierPayments = payments.filter((p) => p.supplierId === s.id);
                const balance = calculateSupplierBalance(supplierOrders, supplierPayments);
                return (
                  <tr key={s.id} className="clickable" onClick={undefined}>
                    <td>
                      <Link href={`/admin/expositores/${s.id}`} className="table-name" style={{ textDecoration: 'none' }}>{s.nomeFantasia}</Link>
                      <div className="table-sub">{s.codigo} · Estande {s.standNumero}</div>
                    </td>
                    <td><StatusBadge value={s.statusCadastral} labelMap={STATUS_CADASTRAL_LABEL} /></td>
                    <td><StatusBadge value={s.statusDash} labelMap={STATUS_DASH_LABEL} /></td>
                    <td><StatusBadge value={s.statusFinanceiro} labelMap={STATUS_FINANCEIRO_LABEL} /></td>
                    <td className="money pending">{fmtMoney(balance.saldoPendente)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
