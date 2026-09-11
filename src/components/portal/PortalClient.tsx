'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { StatusBadge, Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtMoney, fmtDate, fmtDateShort } from '@/utils/format';
import {
  STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, STATUS_FINANCEIRO_LABEL, STATUS_GERAL_LABEL,
  APPROVAL_STATUS_LABEL, BILLING_UNIT_LABEL, DOCUMENT_STATUS_LABEL,
} from '@/config/labels';
import { calculateSupplierBalance, calculateOrderItemTotal } from '@/modules/orders/calculations';
import { updateSupplierSelfAction, submitSupplierForReviewAction } from '@/modules/suppliers/actions';
import { requestOrderItemAction } from '@/modules/orders/actions';
import { addTeamMemberAction, removeTeamMemberAction } from '@/modules/team/actions';
import { addDocumentAction } from '@/modules/documents/actions';
import type { Supplier, SupplierOrder, Payment, CatalogItem, TeamMember, SupplierDocument, Deadline, AuditLog } from '@/types/domain';

const TABS = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'extras', label: 'Extras' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'prazos', label: 'Prazos' },
  { key: 'manual', label: 'Manual do expositor' },
  { key: 'historico', label: 'Histórico' },
];

export function PortalClient({ userName, eventName, supplier, orders, payments, catalogItems, team, documents, deadlines, auditLogs }: {
  userName: string; eventName: string; supplier: Supplier; orders: SupplierOrder[]; payments: Payment[];
  catalogItems: CatalogItem[]; team: TeamMember[]; documents: SupplierDocument[]; deadlines: Deadline[]; auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [tab, setTab] = useState('geral');
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const balance = calculateSupplierBalance(orders, payments);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    try { await signOut(getFirebaseAuthClient()); } catch { /* noop */ }
    router.push('/login');
    router.refresh();
  }

  function refresh() { router.refresh(); }

  return (
    <div>
      <div className="portal-topbar">
        <div className="brand-mark">dash<span className="dot">.</span> <span style={{ fontSize: 12, fontWeight: 500, color: '#C7CAF0' }}>Portal do Expositor</span></div>
        <div className="user-chip" style={{ background: 'rgba(255,255,255,.08)', borderColor: 'transparent', color: '#fff' }} onClick={() => setLogoutConfirm(true)}>
          <div className="avatar">{initials(userName)}</div>
          <div><span className="name" style={{ color: '#fff' }}>{userName}</span><span className="role" style={{ color: '#C7CAF0' }}>Expositor</span></div>
        </div>
      </div>

      <ToastHost />
      <div className="portal-shell">
        <div className="supplier-header">
          <div>
            <h1>Olá, {supplier.nomeFantasia}</h1>
            <div className="stand">Estande {supplier.standNumero} · {supplier.standLocalizacao || '—'} · {eventName}</div>
          </div>
          <StatusBadge value={supplier.statusGeral} labelMap={STATUS_GERAL_LABEL} />
        </div>

        <div className="tabs">
          {TABS.map((t) => <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </div>

        {tab === 'geral' && <PortalGeral supplier={supplier} balance={balance} orders={orders} />}
        {tab === 'cadastro' && <PortalCadastro supplier={supplier} toast={toast} refresh={refresh} />}
        {tab === 'extras' && <PortalExtras orders={orders} catalogItems={catalogItems} toast={toast} refresh={refresh} />}
        {tab === 'equipe' && <PortalEquipe supplier={supplier} team={team} toast={toast} refresh={refresh} />}
        {tab === 'documentos' && <PortalDocumentos supplier={supplier} documents={documents} toast={toast} refresh={refresh} />}
        {tab === 'financeiro' && <PortalFinanceiro balance={balance} payments={payments} />}
        {tab === 'prazos' && <PortalPrazos deadlines={deadlines} />}
        {tab === 'manual' && <PortalManual />}
        {tab === 'historico' && <PortalHistorico auditLogs={auditLogs} />}
      </div>

      <ConfirmModal open={logoutConfirm} title="Sair da conta" message={`Deseja encerrar a sessão de ${userName}?`} confirmLabel="Sair"
        onCancel={() => setLogoutConfirm(false)} onConfirm={handleLogout} />
    </div>
  );
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(); }

/* --------------------------------- GERAL ---------------------------------- */
function PortalGeral({ supplier, balance, orders }: { supplier: Supplier; balance: ReturnType<typeof calculateSupplierBalance>; orders: SupplierOrder[] }) {
  const pendencias: string[] = [];
  if (['NOT_STARTED', 'IN_PROGRESS'].includes(supplier.statusCadastral)) pendencias.push('Finalize o preenchimento do seu cadastro e envie para análise.');
  if (supplier.statusCadastral === 'NEEDS_CORRECTION') pendencias.push('A produção solicitou uma correção no seu cadastro.');
  if (['PENDING_REVIEW', 'UNDER_REVIEW'].includes(supplier.statusDash)) pendencias.push('Seu cadastro está em análise pela equipe DASH.');
  const pendentesAprovacao = orders.flatMap((o) => o.items).filter((i) => i.approvalStatus === 'PENDING').length;
  if (pendentesAprovacao > 0) pendencias.push(`${pendentesAprovacao} extra(s) aguardando aprovação da DASH.`);
  if (balance.saldoPendente > 0) pendencias.push(`Você tem ${fmtMoney(balance.saldoPendente)} em aberto.`);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Status do cadastro</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusCadastral} labelMap={STATUS_CADASTRAL_LABEL} /></div></div>
        <div className="stat-card"><div className="label">Validação DASH</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusDash} labelMap={STATUS_DASH_LABEL} /></div></div>
        <div className="stat-card"><div className="label">Status financeiro</div><div style={{ marginTop: 8 }}><StatusBadge value={supplier.statusFinanceiro} labelMap={STATUS_FINANCEIRO_LABEL} /></div></div>
      </div>
      {pendencias.length > 0 && (
        <div className="card mb-16">
          <div className="card-header"><h3>Pendências</h3></div>
          <div className="card-body"><ul className="checklist">{pendencias.map((p, i) => <li key={i}>⏳ {p}</li>)}</ul></div>
        </div>
      )}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card"><div className="label">Total solicitado</div><div className="value">{fmtMoney(balance.solicitado)}</div></div>
        <div className="stat-card accent-pink"><div className="label">Total aprovado</div><div className="value">{fmtMoney(balance.aprovado)}</div></div>
        <div className="stat-card"><div className="label">Saldo pendente</div><div className="value">{fmtMoney(balance.saldoPendente)}</div></div>
      </div>
    </>
  );
}

/* ------------------------------- CADASTRO ---------------------------------- */
function PortalCadastro({ supplier, toast, refresh }: { supplier: Supplier; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = supplier.statusCadastral === 'IN_PROGRESS' || supplier.statusCadastral === 'NEEDS_CORRECTION';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      razaoSocial: String(fd.get('razaoSocial') || ''), nomeFantasia: String(fd.get('nomeFantasia') || ''), cnpj: String(fd.get('cnpj') || ''),
      inscricaoEstadual: String(fd.get('inscricaoEstadual') || ''),
      endereco: { logradouro: String(fd.get('logradouro') || ''), numero: String(fd.get('numero') || ''), bairro: String(fd.get('bairro') || ''), cidade: String(fd.get('cidade') || ''), estado: String(fd.get('estado') || '').toUpperCase(), cep: String(fd.get('cep') || '') },
      responsavel: { nome: String(fd.get('respNome') || ''), cargo: String(fd.get('respCargo') || ''), email: String(fd.get('respEmail') || ''), telefone: String(fd.get('respTelefone') || '') },
      standMetragem: Number(fd.get('standMetragem') || 0),
    };
    const result = await updateSupplierSelfAction(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    toast('Cadastro atualizado com sucesso.', 'success');
    refresh();
  }

  async function handleSubmitForReview() {
    setSubmitting(true);
    const result = await submitSupplierForReviewAction();
    setSubmitting(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Cadastro enviado para análise da DASH.', 'success');
    refresh();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Meus dados cadastrais</h3>
        <button className="btn btn-primary btn-sm" disabled={!canSubmit || submitting} onClick={handleSubmitForReview}>
          {submitting ? 'Enviando...' : 'Enviar cadastro para análise'}
        </button>
      </div>
      <div className="card-body">
        {supplier.statusCadastral === 'VALIDATED' && (
          <p className="text-sm mb-16" style={{ color: 'var(--success)' }}>✅ Seu cadastro já foi validado pela DASH. Alterações continuarão salvando normalmente.</p>
        )}
        {error && <div className="login-error show">{error}</div>}
        <form className="flex-col gap-16" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Dados da empresa</legend>
            <div className="form-grid">
              <div className="field full"><label>Razão social <span className="req">*</span></label><input required name="razaoSocial" defaultValue={supplier.razaoSocial} /></div>
              <div className="field"><label>Nome fantasia <span className="req">*</span></label><input required name="nomeFantasia" defaultValue={supplier.nomeFantasia} /></div>
              <div className="field"><label>CNPJ <span className="req">*</span></label><input required name="cnpj" defaultValue={supplier.cnpj} /></div>
              <div className="field"><label>Inscrição estadual</label><input name="inscricaoEstadual" defaultValue={supplier.inscricaoEstadual} /></div>
              <div className="field"><label>Metragem do stand (m²)</label><input type="number" min={0} name="standMetragem" defaultValue={supplier.standMetragem} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Endereço</legend>
            <div className="form-grid cols-3">
              <div className="field"><label>Logradouro</label><input name="logradouro" defaultValue={supplier.endereco.logradouro} /></div>
              <div className="field"><label>Número</label><input name="numero" defaultValue={supplier.endereco.numero} /></div>
              <div className="field"><label>Bairro</label><input name="bairro" defaultValue={supplier.endereco.bairro} /></div>
              <div className="field"><label>Cidade</label><input name="cidade" defaultValue={supplier.endereco.cidade} /></div>
              <div className="field"><label>Estado</label><input name="estado" maxLength={2} defaultValue={supplier.endereco.estado} /></div>
              <div className="field"><label>CEP</label><input name="cep" defaultValue={supplier.endereco.cep} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Responsável</legend>
            <div className="form-grid">
              <div className="field"><label>Nome <span className="req">*</span></label><input required name="respNome" defaultValue={supplier.responsavel.nome} /></div>
              <div className="field"><label>Cargo</label><input name="respCargo" defaultValue={supplier.responsavel.cargo} /></div>
              <div className="field"><label>E-mail <span className="req">*</span></label><input required type="email" name="respEmail" defaultValue={supplier.responsavel.email} /></div>
              <div className="field"><label>Telefone / WhatsApp</label><input name="respTelefone" defaultValue={supplier.responsavel.telefone} /></div>
            </div>
          </fieldset>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------- EXTRAS ----------------------------------- */
function PortalExtras({ orders, catalogItems, toast, refresh }: { orders: SupplierOrder[]; catalogItems: CatalogItem[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const items = orders.flatMap((o) => o.items);

  async function handleRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await requestOrderItemAction(String(fd.get('catalogItemId')), Number(fd.get('quantity')));
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Solicitação enviada com sucesso.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Meus extras solicitados</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Solicitar item extra</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4}><EmptyState icon="🧾" title="Nenhum item solicitado ainda" text="Use o botão acima para solicitar um item extra para o seu estande." /></td></tr>}
            {items.map((it) => (
              <tr key={it.id}>
                <td className="table-name">{it.nameSnapshot}</td><td>{it.quantity}</td>
                <td className="money">{fmtMoney(calculateOrderItemTotal(it))}</td>
                <td><StatusBadge value={it.approvalStatus} labelMap={APPROVAL_STATUS_LABEL} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={drawerOpen} title="Solicitar item extra" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="req-form" className="btn btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar solicitação'}</button></>}>
        <form id="req-form" className="flex-col gap-16" onSubmit={handleRequest}>
          <div className="field"><label>Item <span className="req">*</span></label>
            <select name="catalogItemId" required>{catalogItems.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name} ({fmtMoney(i.price)} / {BILLING_UNIT_LABEL[i.billingUnit]})</option>)}</select></div>
          <div className="field"><label>Quantidade <span className="req">*</span></label><input type="number" min={1} name="quantity" defaultValue={1} required /></div>
          <p className="text-sm text-muted">Este pedido ficará com status &quot;Pendente&quot; até a aprovação da equipe DASH.</p>
        </form>
      </Drawer>
    </div>
  );
}

/* -------------------------------- EQUIPE ------------------------------------ */
function PortalEquipe({ supplier, team, toast, refresh }: { supplier: Supplier; team: TeamMember[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await addTeamMemberAction(supplier.id, { nome: fd.get('nome'), cargo: fd.get('cargo'), email: fd.get('email'), telefone: fd.get('telefone'), tipoCredencial: fd.get('tipoCredencial') });
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Integrante adicionado.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  async function handleRemove(id: string) {
    const result = await removeTeamMemberAction(id, supplier.id);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Integrante removido.', 'success');
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Minha equipe credenciada</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Adicionar integrante</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Cargo</th><th>Credencial</th><th></th></tr></thead>
          <tbody>
            {team.length === 0 && <tr><td colSpan={4}><EmptyState icon="👥" title="Nenhum integrante cadastrado" text="Cadastre quem vai representar seu estande no evento." /></td></tr>}
            {team.map((m) => (
              <tr key={m.id}><td className="table-name">{m.nome}</td><td>{m.cargo}</td><td><Badge label={m.tipoCredencial} tone="info" /></td>
                <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m.id)}>Remover</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={drawerOpen} title="Adicionar integrante" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="team-form-portal" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</button></>}>
        <form id="team-form-portal" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Nome <span className="req">*</span></label><input required name="nome" /></div>
          <div className="field"><label>Cargo/função <span className="req">*</span></label><input required name="cargo" /></div>
          <div className="field"><label>E-mail</label><input type="email" name="email" /></div>
          <div className="field"><label>Telefone</label><input name="telefone" /></div>
          <div className="field"><label>Tipo de credencial <span className="req">*</span></label>
            <select name="tipoCredencial" required><option>Equipe de montagem</option><option>Vendedor</option><option>Recepção</option><option>Coordenação</option><option>Outro</option></select></div>
        </form>
      </Drawer>
    </div>
  );
}

/* ------------------------------ DOCUMENTOS ----------------------------------- */
function PortalDocumentos({ supplier, documents, toast, refresh }: { supplier: Supplier; documents: SupplierDocument[]; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type=file]');
    const name = fileInput?.files?.[0]?.name || String(fd.get('nome') || '');
    const result = await addDocumentAction(supplier.id, { nome: name, tipo: fd.get('tipo') });
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Documento enviado.', 'success');
    setDrawerOpen(false);
    refresh();
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Meus documentos</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Enviar documento</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Status</th><th>Enviado em</th></tr></thead>
          <tbody>
            {documents.length === 0 && <tr><td colSpan={4}><EmptyState icon="📄" title="Nenhum documento enviado" text="Envie os documentos exigidos pela produção do evento." /></td></tr>}
            {documents.map((d) => (
              <tr key={d.id}><td className="table-name">{d.nome}</td><td>{d.tipo}</td>
                <td><StatusBadge value={d.status} labelMap={DOCUMENT_STATUS_LABEL} /></td><td>{fmtDateShort(d.uploadedAt)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={drawerOpen} title="Enviar documento" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="doc-form" className="btn btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar'}</button></>}>
        <form id="doc-form" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Tipo de documento <span className="req">*</span></label>
            <select name="tipo" required><option>Contrato social</option><option>Cartão CNPJ</option><option>Ficha técnica do estande</option><option>ART/Laudo elétrico</option><option>Outro</option></select></div>
          <div className="field"><label>Arquivo <span className="req">*</span></label><input type="file" required /></div>
          <p className="text-sm text-muted">Nesta versão o nome do arquivo é registrado no sistema; o armazenamento do binário no Firebase Storage é o próximo passo (ver docs/BATCH-01-DELIVERY.md).</p>
        </form>
      </Drawer>
    </div>
  );
}

/* ------------------------------ FINANCEIRO ------------------------------------ */
function PortalFinanceiro({ balance, payments }: { balance: ReturnType<typeof calculateSupplierBalance>; payments: Payment[] }) {
  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="stat-card"><div className="label">Total solicitado</div><div className="value">{fmtMoney(balance.solicitado)}</div></div>
        <div className="stat-card accent-pink"><div className="label">Total aprovado</div><div className="value">{fmtMoney(balance.aprovado)}</div></div>
        <div className="stat-card accent-success"><div className="label">Total pago</div><div className="value">{fmtMoney(balance.pago)}</div></div>
        <div className="stat-card"><div className="label">Saldo pendente</div><div className="value">{fmtMoney(balance.saldoPendente)}</div></div>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar"><h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Resumo de pagamentos</h3></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Valor</th><th>Método</th><th>Referência</th><th>Data</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={4}><EmptyState icon="💳" title="Nenhum pagamento registrado" text="Assim que houver cobrança, ela aparecerá aqui." /></td></tr>}
              {payments.map((p) => (
                <tr key={p.id}><td className="money">{fmtMoney(p.amount)}</td><td>{p.paymentMethod || '—'}</td><td>{p.reference || '—'}</td><td>{fmtDateShort(p.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- PRAZOS -------------------------------------- */
function PortalPrazos({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <div className="table-wrap">
      <div className="table-toolbar"><h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>Prazos do evento</h3></div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Prazo</th><th>Descrição</th><th>Data limite</th></tr></thead>
          <tbody>
            {deadlines.length === 0 && <tr><td colSpan={3}><EmptyState icon="🗓" title="Nenhum prazo cadastrado" text="A produção ainda não cadastrou prazos para este evento." /></td></tr>}
            {deadlines.map((d) => <tr key={d.id}><td className="table-name">{d.titulo}</td><td>{d.descricao || '—'}</td><td>{fmtDateShort(d.dataLimite)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------- MANUAL DO EXPOSITOR -------------------------------- */
function PortalManual() {
  return (
    <div className="card">
      <div className="card-header"><h3>Manual do expositor</h3></div>
      <div className="card-body flex-col gap-16">
        <p className="text-secondary text-sm">Orientações gerais para montagem, desmontagem e participação no evento.</p>
        <ul className="checklist">
          <li className="ok">✅ Horários de montagem e desmontagem serão informados pela produção.</li>
          <li className="ok">✅ Itens extras contratados devem ser retirados/instalados conforme cronograma do evento.</li>
          <li className="ok">✅ Em caso de dúvidas, utilize os contatos informados no seu e-mail de confirmação.</li>
        </ul>
        <p className="text-sm text-muted">Nesta versão o manual é um conteúdo estático. Uma versão futura poderá permitir upload de um PDF por evento (Firebase Storage).</p>
      </div>
    </div>
  );
}

/* -------------------------------- HISTÓRICO -------------------------------------- */
function PortalHistorico({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Data</th><th>Ação</th><th>Detalhes</th></tr></thead>
          <tbody>
            {auditLogs.length === 0 && <tr><td colSpan={3}><EmptyState icon="🕓" title="Sem histórico ainda" text="As alterações do seu cadastro aparecerão aqui." /></td></tr>}
            {auditLogs.map((l) => <tr key={l.id}><td>{fmtDate(l.createdAt)}</td><td><Badge label={l.action.replaceAll('_', ' ')} tone="info" /></td><td>{l.details}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
