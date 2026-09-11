'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { STATUS_GERAL_LABEL, STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, STATUS_FINANCEIRO_LABEL } from '@/config/labels';
import { createSupplierAction, updateSupplierAdminAction, setSupplierActiveAction } from '@/modules/suppliers/actions';
import type { Supplier } from '@/types/domain';

export function ExpositoresClient({ eventId, suppliers, categories }: { eventId: string; suppliers: Supplier[]; categories: string[] }) {
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

    const result = editing
      ? await updateSupplierAdminAction(editing.id, payload)
      : await createSupplierAction(eventId, payload);

    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast(editing ? 'Expositor atualizado com sucesso.' : 'Expositor cadastrado com sucesso.', 'success');
    setDrawerOpen(false);
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
                <tr key={s.id} className="clickable">
                  <td>
                    <Link href={`/admin/expositores/${s.id}`} className="table-name" style={{ textDecoration: 'none' }}>{s.nomeFantasia}</Link>
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
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Editar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmTarget(s)}>
                        {s.statusGeral === 'INACTIVE' ? 'Reativar' : 'Desativar'}
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
              <div className="field"><label>CNPJ <span className="req">*</span></label>
                <input required name="cnpj" placeholder="00.000.000/0000-00" defaultValue={editing?.cnpj} /></div>
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
                <select name="categoria" defaultValue={editing?.categoria ?? categories[0]}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field full"><label>Observações internas DASH</label>
                <textarea name="observacoesInternas" defaultValue={editing?.observacoesInternas} /></div>
            </div>
          </fieldset>
        </form>
      </Drawer>

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
    </>
  );
}
