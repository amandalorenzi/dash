'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { STATUS_GERAL_LABEL, STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, STATUS_FINANCEIRO_LABEL } from '@/config/labels';
import {
  createSupplierAction, updateSupplierAdminAction, setSupplierActiveAction, resetSupplierPasswordAction,
  deleteSupplierAction, getSupplierDeletionImpactAction, type SupplierDeletionImpact,
} from '@/modules/suppliers/actions';
import { fmtMoney } from '@/utils/format';
import type { Supplier } from '@/types/domain';

export function ExpositoresClient({ eventId, suppliers, categories, alerts }: {
  eventId: string; suppliers: Supplier[]; categories: string[];
  alerts: Record<string, { pending: number; awaitingReply: boolean }>;
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [impact, setImpact] = useState<SupplierDeletionImpact | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch = !term || [s.nomeFantasia, s.razaoSocial, s.codigo, s.cnpj].some((v) => v.toLowerCase().includes(term));
      const matchesStatus = !statusFilter || s.statusGeral === statusFilter;
      const matchesCategoria = !categoryFilter || s.categoria === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategoria;
    });
  }, [suppliers, search, statusFilter, categoryFilter]);

  function openCreate() { setEditing(null); setFormError(null); setDrawerOpen(true); }
  function openEdit(s: Supplier) { setEditing(s); setFormError(null); setDrawerOpen(true); }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      razaoSocial: String(fd.get('razaoSocial') || ''),
      nomeFantasia: String(fd.get('nomeFantasia') || ''),
      cnpj: String(fd.get('cnpj') || ''),
      inscricaoEstadual: String(fd.get('inscricaoEstadual') || ''),
      endereco: { logradouro: '', numero: '', bairro: '', cidade: String(fd.get('cidade') || ''), estado: String(fd.get('estado') || '').toUpperCase(), cep: '' },
      responsavel: {
        nome: String(fd.get('respNome') || ''), cargo: String(fd.get('respCargo') || ''),
        email: String(fd.get('respEmail') || ''), telefone: String(fd.get('respTelefone') || ''),
      },
      standNumero: String(fd.get('standNumero') || ''),
      standLocalizacao: String(fd.get('standLocalizacao') || ''),
      categoria: String(fd.get('categoria') || ''),
      observacoesInternas: String(fd.get('observacoesInternas') || ''),
    };

    if (editing) {
      const result = await updateSupplierAdminAction(editing.id, payload);
      setSaving(false);
      if (!result.ok) { setFormError(result.error); return; }
      toast('Expositor atualizado com sucesso.', 'success');
      setDrawerOpen(false);
      router.refresh();
      return;
    }

    const result = await createSupplierAction(eventId, payload, String(fd.get('loginEmail') || ''));
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast('Expositor cadastrado com sucesso.', 'success');
    setDrawerOpen(false);
    if (result.credentials) setCredentials(result.credentials);
    router.refresh();
  }

  async function openDelete(s: Supplier) {
    setDeleting(s); setConfirmName(''); setDeleteError(null); setImpact(null);
    setImpact(await getSupplierDeletionImpactAction(s.id));
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    const result = await deleteSupplierAction(deleting.id, confirmName);
    setDeletingBusy(false);
    if (!result.ok) { setDeleteError(result.error); return; }
    toast('Expositor excluído definitivamente.', 'success');
    setDeleting(null);
    router.refresh();
  }

  async function handleResetPassword(s: Supplier) {
    const result = await resetSupplierPasswordAction(s.id);
    if (!result.ok) { toast(result.error, 'error'); return; }
    if (result.credentials) setCredentials(result.credentials);
    toast('Nova senha temporária gerada.', 'success');
    router.refresh();
  }

  async function handleToggleActive() {
    if (!confirmTarget) return;
    const willDeactivate = confirmTarget.statusGeral !== 'INACTIVE';
    const result = await setSupplierActiveAction(confirmTarget.id, !willDeactivate);
    setConfirmTarget(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast(`Expositor ${willDeactivate ? 'desativado' : 'reativado'}.`, 'success');
    router.refresh();
  }

  return (
    <>
      <ToastHost />
      <div className="page-header">
        <div>
          <h1>Expositores</h1>
          <p>Cadastro e gerenciamento de expositores do evento selecionado.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>+ Novo expositor</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input">
              <span className="ic">🔍</span>
              <input placeholder="Buscar por nome, razão social, código ou CNPJ" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Status geral (todos)</option>
              {Object.entries(STATUS_GERAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Categoria (todas)</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <span className="text-sm text-muted">{filtered.length} expositor(es)</span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expositor</th><th>Código</th><th>CNPJ</th><th>Stand</th><th>Categoria</th>
                <th>Status geral</th><th>Cadastral</th><th>DASH</th><th>Financeiro</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10}><EmptyState icon="🔍" title="Nenhum expositor encontrado" text="Ajuste os filtros ou cadastre um novo expositor." /></td></tr>
              )}
              {filtered.map((s) => (
                // A linha inteira abre o expositor; os botões de ação param a
                // propagação para não disparar a navegação junto.
                <tr
                  key={s.id} className="clickable" tabIndex={0} role="link"
                  onClick={() => router.push(`/admin/expositores/${s.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/admin/expositores/${s.id}`); }}
                >
                  <td>
                    <div className="flex items-center gap-8">
                      <div className="table-name">{s.nomeFantasia}</div>
                      {alerts[s.id]?.pending > 0 && (
                        <span className="pill-count" title={`${alerts[s.id].pending} pendência(s)`}>{alerts[s.id].pending}</span>
                      )}
                      {alerts[s.id]?.awaitingReply && (
                        <span title="Aguardando resposta da DASH na Discussão" style={{ fontSize: 13 }}>💬</span>
                      )}
                    </div>
                    <div className="table-sub">{s.razaoSocial}</div>
                  </td>
                  <td>{s.codigo}</td>
                  <td>{s.cnpj}</td>
                  <td>{s.standNumero} <span className="text-muted text-sm">· {s.standLocalizacao}</span></td>
                  <td>{s.categoria}</td>
                  <td><StatusBadge value={s.statusGeral} labelMap={STATUS_GERAL_LABEL} /></td>
                  <td><StatusBadge value={s.statusCadastral} labelMap={STATUS_CADASTRAL_LABEL} /></td>
                  <td><StatusBadge value={s.statusDash} labelMap={STATUS_DASH_LABEL} /></td>
                  <td><StatusBadge value={s.statusFinanceiro} labelMap={STATUS_FINANCEIRO_LABEL} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Editar</button>
                      {s.responsavel.email && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(s)}>
                          {s.authUid ? 'Gerar nova senha' : 'Criar acesso'}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmTarget(s)}>
                        {s.statusGeral === 'INACTIVE' ? 'Reativar' : 'Desativar'}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => openDelete(s)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Mostrando {filtered.length} de {suppliers.length} expositores do evento</span>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? `Editar expositor · ${editing.nomeFantasia}` : 'Novo expositor'}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" form="supplier-form" disabled={saving}>{saving ? 'Salvando...' : 'Salvar expositor'}</button>
          </>
        }
      >
        <form id="supplier-form" className="flex-col gap-16" onSubmit={handleSubmit}>
          {formError && <div className="login-error show">{formError}</div>}
          <fieldset>
            <legend>Dados da empresa</legend>
            <div className="form-grid">
              <div className="field full"><label>Razão social <span className="req">*</span></label>
                <input required name="razaoSocial" defaultValue={editing?.razaoSocial} /></div>
              <div className="field"><label>Nome fantasia <span className="req">*</span></label>
                <input required name="nomeFantasia" defaultValue={editing?.nomeFantasia} /></div>
              <div className="field"><label>CNPJ</label>
                <input name="cnpj" placeholder="00.000.000/0000-00 (opcional)" defaultValue={editing?.cnpj} /></div>
              <div className="field"><label>Inscrição estadual</label>
                <input name="inscricaoEstadual" defaultValue={editing?.inscricaoEstadual} /></div>
              <div className="field"><label>Cidade</label><input name="cidade" defaultValue={editing?.endereco.cidade} /></div>
              <div className="field"><label>Estado</label><input name="estado" maxLength={2} defaultValue={editing?.endereco.estado} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Responsável</legend>
            <div className="form-grid">
              <div className="field"><label>Nome <span className="req">*</span></label><input required name="respNome" defaultValue={editing?.responsavel.nome} /></div>
              <div className="field"><label>Cargo</label><input name="respCargo" defaultValue={editing?.responsavel.cargo} /></div>
              <div className="field"><label>E-mail <span className="req">*</span></label><input required type="email" name="respEmail" defaultValue={editing?.responsavel.email} /></div>
              <div className="field"><label>Telefone / WhatsApp</label><input name="respTelefone" defaultValue={editing?.responsavel.telefone} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Dados do evento</legend>
            <div className="form-grid cols-3">
              <div className="field"><label>Número do stand <span className="req">*</span></label><input required name="standNumero" defaultValue={editing?.standNumero} /></div>
              <div className="field"><label>Localização</label><input name="standLocalizacao" defaultValue={editing?.standLocalizacao} /></div>
              <div className="field"><label>Categoria</label>
                <select name="categoria" defaultValue={editing?.categoria ?? ''}>
                  <option value="">Sem categoria</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field full"><label>Observações internas DASH</label>
                <textarea name="observacoesInternas" defaultValue={editing?.observacoesInternas} /></div>
            </div>
          </fieldset>
          {!editing && (
            <fieldset>
              <legend>Acesso ao portal (opcional)</legend>
              <div className="field full">
                <label>E-mail de login</label>
                <input type="email" name="loginEmail" placeholder="Deixe em branco para não criar acesso agora" />
                <p className="help">Se preenchido, uma senha temporária forte é gerada e mostrada uma única vez ao salvar — você a copia e repassa ao expositor por fora do sistema. Ele será obrigado a trocá-la no primeiro acesso.</p>
              </div>
            </fieldset>
          )}
        </form>
      </Drawer>

      {credentials && (
        <div className="overlay open" onMouseDown={(e) => { if (e.target === e.currentTarget) setCredentials(null); }}>
          <div className="modal">
            <h3>Acesso criado</h3>
            <p>Copie estas credenciais agora — a senha não será mostrada novamente. Repasse ao expositor por fora do sistema (WhatsApp, telefone, etc.).</p>
            <div className="field mb-16">
              <label>E-mail</label>
              <input readOnly value={credentials.email} onFocus={(e) => e.target.select()} />
            </div>
            <div className="field mb-16">
              <label>Senha temporária</label>
              <input readOnly value={credentials.tempPassword} onFocus={(e) => e.target.select()} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setCredentials(null)}>Já copiei, fechar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmTarget?.statusGeral === 'INACTIVE' ? 'Reativar expositor' : 'Desativar expositor'}
        message={
          confirmTarget?.statusGeral === 'INACTIVE'
            ? `"${confirmTarget?.nomeFantasia}" voltará a ficar com status regular.`
            : `"${confirmTarget?.nomeFantasia}" será marcado como inativo. O histórico é mantido (soft delete).`
        }
        confirmLabel={confirmTarget?.statusGeral === 'INACTIVE' ? 'Reativar' : 'Desativar'}
        danger={confirmTarget?.statusGeral !== 'INACTIVE'}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleToggleActive}
      />

      {deleting && (
        <div className="overlay open" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}>
          <div className="modal" style={{ width: 520 }}>
            <h3>Excluir expositor definitivamente</h3>
            <p>
              Esta ação <strong>não pode ser desfeita</strong>. Se você só quer tirar o expositor da operação
              mantendo o histórico, use <strong>Desativar</strong>.
            </p>

            {impact === null ? (
              <p className="text-sm text-muted">Verificando o que será removido...</p>
            ) : (
              <>
                <p className="text-sm" style={{ marginBottom: 8 }}>Serão apagados junto:</p>
                <ul className="checklist mb-16">
                  <li>🗑 {impact.orders} pedido(s) com {impact.orderItems} item(ns) de extras</li>
                  <li>🗑 {impact.payments} pagamento(s){impact.paidAmount > 0 ? ` — incluindo ${fmtMoney(impact.paidAmount)} já registrados como pagos` : ''}</li>
                  <li>🗑 {impact.teamMembers} integrante(s) de equipe e {impact.documents} documento(s)</li>
                  {impact.hasLogin && <li>🗑 O acesso ao portal deste expositor</li>}
                </ul>
                {impact.paidAmount > 0 && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>
                    Atenção: há pagamento já confirmado no histórico deste expositor. Considere desativar em vez de excluir.
                  </p>
                )}
                <div className="field mb-16">
                  <label>Para confirmar, digite o nome fantasia: <strong>{deleting.nomeFantasia}</strong></label>
                  <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={deleting.nomeFantasia} />
                </div>
              </>
            )}

            {deleteError && <div className="login-error show">{deleteError}</div>}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleting(null)}>Cancelar</button>
              <button
                className="btn btn-danger"
                disabled={deletingBusy || impact === null || confirmName.trim().toLowerCase() !== deleting.nomeFantasia.trim().toLowerCase()}
                onClick={handleDelete}
              >
                {deletingBusy ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
