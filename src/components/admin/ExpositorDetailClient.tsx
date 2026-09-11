'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge, Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtMoney, fmtDate, fmtDateShort } from '@/utils/format';
import {
  STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, STATUS_FINANCEIRO_LABEL, STATUS_GERAL_LABEL,
  ORDER_STATUS_LABEL, APPROVAL_STATUS_LABEL, BILLING_UNIT_LABEL, PAYMENT_STATUS_LABEL, DOCUMENT_STATUS_LABEL,
} from '@/config/labels';
import { calculateSupplierBalance, calculateOrderItemTotal } from '@/modules/orders/calculations';
import { verifySupplierAction, validateSupplierAction, requestCorrectionAction } from '@/modules/suppliers/actions';
import { addManualOrderItemAction, approveOrderItemAction } from '@/modules/orders/actions';
import { registerPaymentAction, updatePaymentStatusAction } from '@/modules/payments/actions';
import { addTeamMemberAction, removeTeamMemberAction } from '@/modules/team/actions';
import { reviewDocumentAction } from '@/modules/documents/actions';
import type { Supplier, SupplierOrder, Payment, CatalogItem, TeamMember, SupplierDocument, AuditLog, PaymentStatus } from '@/types/domain';

const TABS = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'extras', label: 'Extras' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'pagamentos', label: 'Pagamentos' },
  { key: 'historico', label: 'Histórico' },
];

export function ExpositorDetailClient({
  supplier, orders, payments, catalogItems, team, documents, auditLogs,
}: {
  supplier: Supplier; orders: SupplierOrder[]; payments: Payment[]; catalogItems: CatalogItem[];
  team: TeamMember[]; documents: SupplierDocument[]; auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [tab, setTab] = useState('geral');
  const balance = calculateSupplierBalance(orders, payments);

  function refresh() { router.refresh(); }

  return (
    <>
      <ToastHost />
      <div className="breadcrumb"><a href="/admin/expositores">Expositores</a> / {supplier.nomeFantasia}</div>
      <div className="page-header">
        <div>
          <h1>{supplier.nomeFantasia}</h1>
          <p>{supplier.razaoSocial} · Estande {supplier.standNumero} · {supplier.standLocalizacao || '—'}</p>
        </div>
        <StatusBadge value={supplier.statusGeral} labelMap={STATUS_GERAL_LABEL} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'geral' && <TabGeral supplier={supplier} orders={orders} balance={balance} />}
      {tab === 'cadastro' && <TabCadastro supplier={supplier} toast={toast} refresh={refresh} />}
      {tab === 'extras' && <TabExtras supplier={supplier} orders={orders} catalogItems={catalogItems} toast={toast} refresh={refresh} />}
      {tab === 'equipe' && <TabEquipe supplier={supplier} team={team} toast={toast} refresh={refresh} />}
      {tab === 'documentos' && <TabDocumentos documents={documents} toast={toast} refresh={refresh} />}
      {tab === 'pagamentos' && <TabPagamentos supplier={supplier} payments={payments} balance={balance} toast={toast} refresh={refresh} />}
      {tab === 'historico' && <TabHistorico auditLogs={auditLogs} />}
    </>
  );
}

/* ------------------------------ VISÃO GERAL ------------------------------ */
function TabGeral({ supplier, orders, balance }: { supplier: Supplier; orders: SupplierOrder[]; balance: ReturnType<typeof calculateSupplierBalance> }) {
  const pendentes = orders.flatMap((o) => o.items).filter((i) => i.approvalStatus === 'PENDING').length;
  const acoes: { text: string; ok: boolean }[] = [];
  if (['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_CORRECTION'].includes(supplier.statusCadastral)) {
    acoes.push({ text: supplier.statusCadastral === 'NEEDS_CORRECTION' ? 'Cadastro com correção solicitada ao expositor.' : 'Cadastro aguardando conclusão pelo expositor.', ok: false });
  }
  if (['PENDING_REVIEW', 'UNDER_REVIEW'].includes(supplier.statusDash)) acoes.push({ text: 'Cadastro aguardando validação da equipe DASH.', ok: false });
  if (pendentes > 0) acoes.push({ text: `${pendentes} extra(s) aguardando aprovação DASH.`, ok: false });
  if (balance.saldoPendente > 0) acoes.push({ text: `Pagamento pendente de ${fmtMoney(balance.saldoPendente)}.`, ok: false });
  if (acoes.length === 0) acoes.push({ text: 'Nenhuma pendência no momento — expositor em dia.', ok: true });

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Status cadastral</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusCadastral} labelMap={STATUS_CADASTRAL_LABEL} /></div></div>
        <div className="stat-card"><div className="label">Status DASH</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusDash} labelMap={STATUS_DASH_LABEL} /></div></div>
        <div className="stat-card"><div className="label">Status financeiro</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusFinanceiro} labelMap={STATUS_FINANCEIRO_LABEL} /></div></div>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="label">Valor solicitado</div><div className="value">{fmtMoney(balance.solicitado)}</div></div>
        <div className="stat-card accent-pink"><div className="label">Valor aprovado</div><div className="value">{fmtMoney(balance.aprovado)}</div></div>
        <div className="stat-card accent-success"><div className="label">Valor pago</div><div className="value">{fmtMoney(balance.pago)}</div></div>
        <div className="stat-card"><div className="label">Saldo pendente</div><div className="value">{fmtMoney(balance.saldoPendente)}</div></div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Ações necessárias</h3></div>
        <div className="card-body">
          <ul className="checklist">
            {acoes.map((a, i) => <li key={i} className={a.ok ? 'ok' : ''}>{a.ok ? '✅' : '⏳'} {a.text}</li>)}
          </ul>
        </div>
      </div>
    </>
  );
}

/* ------------------------------- CADASTRO --------------------------------- */
function TabCadastro({ supplier, toast, refresh }: { supplier: Supplier; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (!res.ok) { toast(res.error ?? 'Erro.', 'error'); return; }
    toast(okMsg, 'success');
    refresh();
  }

  return (
    <>
      <div className="card mb-16">
        <div className="card-header"><h3>Dados cadastrais</h3></div>
        <div className="card-body">
          <div className="form-grid">
            <div className="field"><label>Razão social</label><div>{supplier.razaoSocial}</div></div>
            <div className="field"><label>Nome fantasia</label><div>{supplier.nomeFantasia}</div></div>
            <div className="field"><label>CNPJ</label><div>{supplier.cnpj}</div></div>
            <div className="field"><label>Inscrição estadual</label><div>{supplier.inscricaoEstadual || '—'}</div></div>
            <div className="field"><label>Cidade / Estado</label><div>{supplier.endereco.cidade} / {supplier.endereco.estado}</div></div>
            <div className="field"><label>Categoria</label><div>{supplier.categoria}</div></div>
            <div className="field"><label>Responsável</label><div>{supplier.responsavel.nome} · {supplier.responsavel.cargo || '—'}</div></div>
            <div className="field"><label>Contato</label><div>{supplier.responsavel.email} · {supplier.responsavel.telefone || '—'}</div></div>
            <div className="field full"><label>Observações internas DASH</label><div>{supplier.observacoesInternas || '—'}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Verificação e validação DASH</h3></div>
        <div className="card-body">
          <p className="text-secondary text-sm mb-16">&quot;Enviado pelo expositor&quot; não significa &quot;validado pela DASH&quot;. Cada etapa é registrada separadamente.</p>
          <div className="form-grid cols-3 mb-16">
            <div className="field"><label>Verificado em</label><div>{fmtDate(supplier.verifiedAt)}</div></div>
            <div className="field"><label>Verificado por</label><div>{supplier.verifiedBy || '—'}</div></div>
            <div className="field"><label>Status DASH atual</label><StatusBadge value={supplier.statusDash} labelMap={STATUS_DASH_LABEL} /></div>
            <div className="field"><label>Validado em</label><div>{fmtDate(supplier.validatedAt)}</div></div>
            <div className="field"><label>Validado por</label><div>{supplier.validatedBy || '—'}</div></div>
          </div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" disabled={busy || ['VERIFIED', 'VALIDATED'].includes(supplier.statusDash)}
              onClick={() => run(() => verifySupplierAction(supplier.id), 'Cadastro marcado como verificado.')}>Marcar como verificado</button>
            <button className="btn btn-primary" disabled={busy || supplier.statusDash !== 'VERIFIED'}
              onClick={() => run(() => validateSupplierAction(supplier.id), 'Cadastro validado com sucesso.')}>Validar cadastro</button>
            <button className="btn btn-danger" disabled={busy}
              onClick={() => run(() => requestCorrectionAction(supplier.id), 'Correção solicitada ao expositor.')}>Solicitar correção</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------- EXTRAS --------------------------------- */
function TabExtras({ supplier, orders, catalogItems, toast, refresh }: {
  supplier: Supplier; orders: SupplierOrder[]; catalogItems: CatalogItem[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const items = orders.flatMap((o) => o.items.map((it) => ({ ...it, orderStatus: o.status, orderId: o.id, createdAt: o.createdAt })));
  const total = items.reduce((sum, it) => sum + calculateOrderItemTotal(it), 0);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await addManualOrderItemAction(supplier.id, String(fd.get('catalogItemId')), Number(fd.get('quantity')), String(fd.get('notes') || ''));
    setSaving(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast('Item adicionado com sucesso.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  async function handleApprove(orderId: string, itemId: string, approve: boolean) {
    const res = await approveOrderItemAction(orderId, itemId, approve);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast(`Item ${approve ? 'aprovado' : 'rejeitado'}.`, 'success');
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Itens extras solicitados</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Adicionar item manualmente</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Preço unit.</th><th>Total</th><th>Status pedido</th><th>Aprovação</th><th>Data</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={8}><EmptyState icon="🧾" title="Nenhum extra registrado" text="Adicione manualmente um item solicitado por telefone, WhatsApp ou presencialmente." /></td></tr>}
            {items.map((it) => (
              <tr key={it.id}>
                <td><div className="table-name">{it.nameSnapshot}</div><div className="table-sub">{it.codeSnapshot}</div></td>
                <td>{it.quantity} {BILLING_UNIT_LABEL[it.unitSnapshot]}</td>
                <td className="money">{fmtMoney(it.unitPriceSnapshot)}</td>
                <td className="money">{fmtMoney(calculateOrderItemTotal(it))}</td>
                <td><StatusBadge value={it.orderStatus} labelMap={ORDER_STATUS_LABEL} /></td>
                <td><StatusBadge value={it.approvalStatus} labelMap={APPROVAL_STATUS_LABEL} /></td>
                <td>{fmtDateShort(it.createdAt)}</td>
                <td className="row-actions">
                  {it.approvalStatus === 'PENDING' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleApprove(it.orderId, it.id, true)}>Aprovar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleApprove(it.orderId, it.id, false)}>Rejeitar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span /><span><strong>Total: {fmtMoney(total)}</strong></span></div>

      <Drawer open={drawerOpen} title="Adicionar item manualmente" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="add-item-form" className="btn btn-primary" disabled={saving}>{saving ? 'Adicionando...' : 'Adicionar item'}</button></>}>
        <form id="add-item-form" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Item do catálogo <span className="req">*</span></label>
            <select name="catalogItemId" required>
              {catalogItems.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name} ({fmtMoney(i.price)} / {BILLING_UNIT_LABEL[i.billingUnit]})</option>)}
            </select>
          </div>
          <div className="field"><label>Quantidade <span className="req">*</span></label><input type="number" name="quantity" min={1} defaultValue={1} required /></div>
          <div className="field"><label>Observações</label><textarea name="notes" placeholder="Ex: solicitado por telefone" /></div>
        </form>
      </Drawer>
    </div>
  );
}

/* --------------------------------- EQUIPE --------------------------------- */
function TabEquipe({ supplier, team, toast, refresh }: { supplier: Supplier; team: TeamMember[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await addTeamMemberAction(supplier.id, {
      nome: fd.get('nome'), cargo: fd.get('cargo'), email: fd.get('email'), telefone: fd.get('telefone'), tipoCredencial: fd.get('tipoCredencial'),
    });
    setSaving(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast('Integrante adicionado.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  async function handleRemove(id: string) {
    const res = await removeTeamMemberAction(id, supplier.id);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast('Integrante removido.', 'success');
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Equipe credenciada</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Adicionar integrante</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Cargo</th><th>Contato</th><th>Credencial</th><th></th></tr></thead>
          <tbody>
            {team.length === 0 && <tr><td colSpan={5}><EmptyState icon="👥" title="Nenhum integrante cadastrado" text="A equipe é cadastrada pelo próprio expositor no portal, ou manualmente aqui." /></td></tr>}
            {team.map((m) => (
              <tr key={m.id}>
                <td className="table-name">{m.nome}</td><td>{m.cargo}</td>
                <td>{m.email || '—'} {m.telefone ? `· ${m.telefone}` : ''}</td>
                <td><Badge label={m.tipoCredencial} tone="info" /></td>
                <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={drawerOpen} title="Adicionar integrante de equipe" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="team-form" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</button></>}>
        <form id="team-form" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Nome <span className="req">*</span></label><input required name="nome" /></div>
          <div className="field"><label>Cargo/função <span className="req">*</span></label><input required name="cargo" /></div>
          <div className="field"><label>E-mail</label><input type="email" name="email" /></div>
          <div className="field"><label>Telefone</label><input name="telefone" /></div>
          <div className="field"><label>Tipo de credencial <span className="req">*</span></label>
            <select name="tipoCredencial" required>
              <option>Equipe de montagem</option><option>Vendedor</option><option>Recepção</option><option>Coordenação</option><option>Outro</option>
            </select>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

/* ------------------------------- DOCUMENTOS -------------------------------- */
function TabDocumentos({ documents, toast, refresh }: { documents: SupplierDocument[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    const res = await reviewDocumentAction(id, status);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast(`Documento ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'}.`, 'success');
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar"><h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Documentos enviados</h3></div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Status</th><th>Enviado em</th><th></th></tr></thead>
          <tbody>
            {documents.length === 0 && <tr><td colSpan={5}><EmptyState icon="📄" title="Nenhum documento enviado" text="Documentos são enviados pelo próprio expositor no portal." /></td></tr>}
            {documents.map((d) => (
              <tr key={d.id}>
                <td className="table-name">{d.nome}</td><td>{d.tipo}</td>
                <td><StatusBadge value={d.status} labelMap={DOCUMENT_STATUS_LABEL} /></td>
                <td>{fmtDateShort(d.uploadedAt)}</td>
                <td className="row-actions">
                  {d.status === 'PENDING_REVIEW' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleReview(d.id, 'APPROVED')}>Aprovar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleReview(d.id, 'REJECTED')}>Rejeitar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------- PAGAMENTOS -------------------------------- */
function TabPagamentos({ supplier, payments, balance, toast, refresh }: {
  supplier: Supplier; payments: Payment[]; balance: ReturnType<typeof calculateSupplierBalance>; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await registerPaymentAction(supplier.id, { amount: fd.get('amount'), paymentMethod: fd.get('paymentMethod'), reference: fd.get('reference'), notes: fd.get('notes') });
    setSaving(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast('Pagamento registrado.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  async function handleStatus(id: string, status: PaymentStatus) {
    const res = await updatePaymentStatusAction(id, status);
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast('Status atualizado.', 'success');
    refresh();
  }

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Total solicitado</div><div className="value">{fmtMoney(balance.solicitado)}</div></div>
        <div className="stat-card accent-pink"><div className="label">Total aprovado</div><div className="value">{fmtMoney(balance.aprovado)}</div></div>
        <div className="stat-card accent-success"><div className="label">Total pago</div><div className="value">{fmtMoney(balance.pago)}</div></div>
        <div className="stat-card"><div className="label">Saldo pendente</div><div className="value">{fmtMoney(balance.saldoPendente)}</div></div>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Pagamentos</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Registrar pagamento</button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Valor</th><th>Status</th><th>Método</th><th>Referência</th><th>Criado em</th><th></th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={6}><EmptyState icon="💳" title="Nenhum pagamento registrado" text="Registre um pagamento assim que houver cobrança." /></td></tr>}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="money">{fmtMoney(p.amount)}</td>
                  <td><StatusBadge value={p.status} labelMap={PAYMENT_STATUS_LABEL} /></td>
                  <td>{p.paymentMethod || '—'}</td><td>{p.reference || '—'}</td><td>{fmtDateShort(p.createdAt)}</td>
                  <td className="row-actions">
                    <select className="filter-select" style={{ minWidth: 160 }} defaultValue="" onChange={(e) => { if (e.target.value) handleStatus(p.id, e.target.value as PaymentStatus); }}>
                      <option value="" disabled>Alterar status...</option>
                      {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Drawer open={drawerOpen} title="Registrar pagamento" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="payment-form" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</button></>}>
        <form id="payment-form" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Valor (R$) <span className="req">*</span></label><input type="number" min={0} step="0.01" name="amount" required /></div>
          <div className="field"><label>Método</label>
            <select name="paymentMethod"><option value="">Não informado</option><option>PIX</option><option>Transferência</option><option>Boleto</option><option>Cartão</option></select>
          </div>
          <div className="field"><label>Referência</label><input name="reference" /></div>
          <div className="field"><label>Observações</label><textarea name="notes" /></div>
        </form>
      </Drawer>
    </>
  );
}

/* -------------------------------- HISTÓRICO -------------------------------- */
function TabHistorico({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead>
          <tbody>
            {auditLogs.length === 0 && <tr><td colSpan={4}><EmptyState icon="🕓" title="Sem histórico ainda" text="As alterações relevantes deste expositor aparecerão aqui." /></td></tr>}
            {auditLogs.map((l) => (
              <tr key={l.id}>
                <td>{fmtDate(l.createdAt)}</td><td>{l.userName}</td>
                <td><Badge label={l.action.replaceAll('_', ' ')} tone="info" /></td>
                <td>{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
