'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { StatusBadge, Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtMoney, fmtDateShort } from '@/utils/format';
import {
  APPROVAL_STATUS_LABEL, BILLING_UNIT_LABEL, DOCUMENT_STATUS_LABEL,
} from '@/config/labels';
import { calculateSupplierBalance, calculateOrderItemTotal } from '@/modules/orders/calculations';
import { updateSupplierSelfAction, submitSupplierForReviewAction } from '@/modules/suppliers/actions';
import { requestOrderItemAction } from '@/modules/orders/actions';
import { addTeamMemberAction, removeTeamMemberAction } from '@/modules/team/actions';
import { addDocumentAction } from '@/modules/documents/actions';
import { uploadFile, buildUploadPath, fileSizeMb } from '@/lib/firebase/storage';
import { EventUpdatesFeed } from '@/components/shared/EventUpdatesFeed';
import { DiscussionPanel } from '@/components/shared/DiscussionPanel';
import { EventHero } from '@/components/portal/EventHero';
import { ExhibitorDashboard } from '@/components/portal/ExhibitorDashboard';
import { Avatar } from '@/components/ui/Avatar';
import { updateMyAvatarAction } from '@/modules/users/profile-actions';
import { mergeDeadlinesWithEvent } from '@/utils/deadlines';
import { markDiscussionReadAction } from '@/modules/discussions/actions';
import type { Supplier, SupplierOrder, Payment, CatalogItem, TeamMember, SupplierDocument, Deadline, FirestoreEvent, EventUpdate, DiscussionMessage } from '@/types/domain';

const TABS = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'updates', label: 'Updates do evento' },
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'extras', label: 'Extras' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'prazos', label: 'Prazos' },
  { key: 'manual', label: 'Manual do expositor' },
  { key: 'discussoes', label: 'Discussões' },
];

export function PortalClient({ userName, userAvatarUrl, lastDiscussionReadAt, eventName, event, updates, supplier, orders, payments, catalogItems, team, documents, deadlines, discussion }: {
  userName: string; userAvatarUrl?: string | null; lastDiscussionReadAt: string | null; eventName: string; event: FirestoreEvent | null; updates: EventUpdate[];
  supplier: Supplier; orders: SupplierOrder[]; payments: Payment[];
  catalogItems: CatalogItem[]; team: TeamMember[]; documents: SupplierDocument[]; deadlines: Deadline[];
  discussion: DiscussionMessage[];
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [tab, setTab] = useState('geral');
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const balance = calculateSupplierBalance(orders, payments);

  const hasUnreadDiscussion = discussion.some((m) => m.authorName !== userName && (!lastDiscussionReadAt || m.createdAt > lastDiscussionReadAt));

  function handleTabChange(next: string) {
    setTab(next);
    if (next === 'discussoes' && hasUnreadDiscussion) markDiscussionReadAction();
  }

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
        <div className="flex items-center gap-16">
          {hasUnreadDiscussion && (
            <button
              className="portal-msg-alert" title="Novas mensagens na Discussão"
              onClick={() => handleTabChange('discussoes')}
            >
              💬<span className="pill-count">●</span>
            </button>
          )}
          <div className="user-chip" style={{ background: 'rgba(255,255,255,.08)', borderColor: 'transparent', color: '#fff' }} onClick={() => setLogoutConfirm(true)}>
            <Avatar name={userName} url={userAvatarUrl} size={28} />
            <div><span className="name" style={{ color: '#fff' }}>{userName}</span><span className="role" style={{ color: '#C7CAF0' }}>Expositor</span></div>
          </div>
        </div>
      </div>

      <ToastHost />

      <EventHero event={event} />

      <div className="portal-tabs">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => handleTabChange(t.key)}>
              {t.label}
              {t.key === 'discussoes' && hasUnreadDiscussion && <span className="pill-count" title="Novas mensagens">●</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="portal-content">
        {tab === 'geral' && (
          <ExhibitorDashboard
            supplier={supplier} event={event} updates={updates} orders={orders}
            team={team} deadlines={mergeDeadlinesWithEvent(event, deadlines)} balance={balance} onNavigate={handleTabChange}
          />
        )}
        {tab === 'updates' && <EventUpdatesFeed eventId={supplier.eventId} updates={updates} canPublish={false} />}
        {tab === 'cadastro' && <PortalCadastro supplier={supplier} userAvatarUrl={userAvatarUrl} toast={toast} refresh={refresh} />}
        {tab === 'extras' && <PortalExtras orders={orders} catalogItems={catalogItems} orderDeadline={event?.orderDeadline ?? null} toast={toast} refresh={refresh} />}
        {tab === 'equipe' && <PortalEquipe supplier={supplier} team={team} toast={toast} refresh={refresh} />}
        {tab === 'documentos' && <PortalDocumentos supplier={supplier} documents={documents} maxUploadSizeMb={event?.maxUploadSizeMb ?? 2} toast={toast} refresh={refresh} />}
        {tab === 'financeiro' && <PortalFinanceiro balance={balance} payments={payments} />}
        {tab === 'prazos' && <PortalPrazos deadlines={mergeDeadlinesWithEvent(event, deadlines)} />}
        {tab === 'manual' && <PortalManual event={event} />}
        {tab === 'discussoes' && <DiscussionPanel supplierId={supplier.id} messages={discussion} viewerSide="EXPOSITOR" />}
      </div>

      <footer className="portal-footer">
        <div className="brand-mark">dash<span className="dot">.</span></div>
        <span>{eventName} | Portal do Expositor</span>
        {event?.tagline && <em>{event.tagline}</em>}
      </footer>

      <ConfirmModal open={logoutConfirm} title="Sair da conta" message={`Deseja encerrar a sessão de ${userName}?`} confirmLabel="Sair"
        onCancel={() => setLogoutConfirm(false)} onConfirm={handleLogout} />
    </div>
  );
}

/* ------------------------------- CADASTRO ---------------------------------- */
function PortalCadastro({ supplier, userAvatarUrl, toast, refresh }: { supplier: Supplier; userAvatarUrl?: string | null; toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(userAvatarUrl ?? '');
  const [savingAvatar, setSavingAvatar] = useState(false);
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

  async function handleAvatarSave() {
    setSavingAvatar(true);
    const result = await updateMyAvatarAction(avatarUrl);
    setSavingAvatar(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Foto de perfil atualizada.', 'success');
    refresh();
  }

  return (
    <div className="flex-col gap-16">
    <div className="card">
      <div className="card-header"><h3>Foto de perfil</h3></div>
      <div className="card-body">
        <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
          <Avatar name={supplier.responsavel.nome} url={avatarUrl} size={56} />
          <div className="field" style={{ flex: 1, minWidth: 260 }}>
            <label>Link da imagem</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            <p className="help">Cole o link de uma imagem (https). Sua foto aparece nas discussões com a equipe DASH.</p>
          </div>
          <button className="btn btn-secondary" onClick={handleAvatarSave} disabled={savingAvatar}>
            {savingAvatar ? 'Salvando...' : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>

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
    </div>
  );
}

/* -------------------------------- EXTRAS ----------------------------------- */
function PortalExtras({ orders, catalogItems, orderDeadline, toast, refresh }: {
  orders: SupplierOrder[]; catalogItems: CatalogItem[]; orderDeadline: string | null;
  toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const items = orders.flatMap((o) => o.items);

  // Compara só a data (sem hora) para o prazo valer até o fim do dia informado.
  const deadlinePassed = Boolean(orderDeadline && new Date().toISOString().slice(0, 10) > orderDeadline);

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
        <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)} disabled={deadlinePassed}>+ Solicitar item extra</button>
      </div>
      {deadlinePassed && (
        <div style={{ padding: '12px 18px', background: 'var(--warning-bg)', color: '#8A5A0F', fontSize: 13 }}>
          O prazo para solicitar novos extras encerrou em {fmtDateShort(orderDeadline)}. Fale com a produção da DASH se precisar de algo adicional.
        </div>
      )}
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
function PortalDocumentos({ supplier, documents, maxUploadSizeMb, toast, refresh }: {
  supplier: Supplier; documents: SupplierDocument[]; maxUploadSizeMb: number;
  toast: (m: string, t?: 'success' | 'error') => void; refresh: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const tipo = String(fd.get('tipo') || '');
    const fileInput = form.querySelector<HTMLInputElement>('input[type=file]');
    const file = fileInput?.files?.[0];
    if (!file) { toast('Selecione um arquivo.', 'error'); return; }
    if (fileSizeMb(file) > maxUploadSizeMb) { toast(`Arquivo muito grande. O limite deste evento é ${maxUploadSizeMb}MB.`, 'error'); return; }

    setSaving(true);
    try {
      const path = buildUploadPath('documents', supplier.eventId, supplier.id, file.name);
      const { url, storagePath } = await uploadFile(path, file);
      const result = await addDocumentAction(supplier.id, { nome: file.name, tipo, url, storagePath, sizeBytes: file.size });
      if (!result.ok) { toast(result.error, 'error'); return; }
      toast('Documento enviado.', 'success');
      setDrawerOpen(false);
      refresh();
    } catch {
      toast('Falha ao enviar o arquivo.', 'error');
    } finally {
      setSaving(false);
    }
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
              <tr key={d.id}>
                <td className="table-name">{d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer">{d.nome}</a> : d.nome}</td>
                <td>{d.tipo}</td>
                <td><StatusBadge value={d.status} labelMap={DOCUMENT_STATUS_LABEL} /></td><td>{fmtDateShort(d.uploadedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer open={drawerOpen} title="Enviar documento" onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="doc-form" className="btn btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar'}</button></>}>
        <form id="doc-form" className="flex-col gap-16" onSubmit={handleAdd}>
          <div className="field"><label>Tipo de documento <span className="req">*</span></label>
            <select name="tipo" required>
              <option>Contrato social</option><option>Cartão CNPJ</option><option>Ficha técnica do estande</option>
              <option>ART/Laudo elétrico</option><option>Comprovante de pagamento</option><option>Outro</option>
            </select>
          </div>
          <div className="field"><label>Arquivo <span className="req">*</span></label><input type="file" required /></div>
          <p className="text-sm text-muted">Tamanho máximo: {maxUploadSizeMb}MB.</p>
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
function PortalManual({ event }: { event: FirestoreEvent | null }) {
  const docs = event?.sharedDocuments ?? [];
  return (
    <div className="flex-col gap-16">
      <div className="card">
        <div className="card-header"><h3>Manual do expositor</h3></div>
        <div className="card-body">
          {event?.guideContent ? (
            <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{event.guideContent}</p>
          ) : (
            <EmptyState icon="📘" title="Manual ainda não publicado" text="A produção da DASH ainda não publicou o manual deste evento." />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Documentos compartilhados pela DASH</h3></div>
        <div className="card-body">
          {docs.length === 0 ? (
            <EmptyState icon="📎" title="Nenhum documento disponível" text="Quando a produção compartilhar documentos, eles aparecerão aqui." />
          ) : (
            <ul className="checklist">
              {docs.map((d) => (
                <li key={d.id} className="ok">
                  📎 <a href={d.url} target="_blank" rel="noopener noreferrer">{d.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

