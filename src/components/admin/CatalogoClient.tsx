'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { BILLING_UNIT_LABEL } from '@/config/labels';
import { fmtMoney, fmtDateShort } from '@/utils/format';
import {
  createCatalogItemAction, updateCatalogItemAction, bulkSetCatalogActiveAction,
  previewCatalogImportAction, applyCatalogImportAction, type ImportPreview,
} from '@/modules/catalog/actions';
import type { CatalogItem, BillingUnit } from '@/types/domain';

const BILLING_UNITS: BillingUnit[] = ['UNIT', 'DAILY', 'HOURLY', 'METER', 'SQUARE_METER', 'POINT', 'PACKAGE', 'SERVICE'];

export function CatalogoClient({ eventId, items, categories }: { eventId: string; items: CatalogItem[]; categories: string[] }) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesSearch = !term || [i.name, i.code, i.category].some((v) => v.toLowerCase().includes(term));
      const matchesCategoria = !categoryFilter || i.category === categoryFilter;
      const matchesStatus = !statusFilter || (statusFilter === 'active' ? i.active : !i.active);
      return matchesSearch && matchesCategoria && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  function openCreate() { setEditing(null); setFormError(null); setDrawerOpen(true); }
  function openEdit(i: CatalogItem) { setEditing(i); setFormError(null); setDrawerOpen(true); }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      code: String(fd.get('code') || ''), name: String(fd.get('name') || ''), description: String(fd.get('description') || ''),
      category: String(fd.get('category') || ''), price: fd.get('price'), billingUnit: fd.get('billingUnit'),
      minQty: fd.get('minQty'), maxQty: fd.get('maxQty'), requiresApproval: fd.get('requiresApproval') === 'true',
      active: fd.get('active') === 'true',
    };
    const result = editing ? await updateCatalogItemAction(editing.id, eventId, payload) : await createCatalogItemAction(eventId, payload);
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast(editing ? 'Item atualizado.' : 'Item cadastrado.', 'success');
    setDrawerOpen(false);
    router.refresh();
  }

  async function handleBulk(active: boolean) {
    const result = await bulkSetCatalogActiveAction(eventId, Array.from(selected), active);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Itens atualizados.', 'success');
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      <ToastHost />
      <div className="page-header">
        <div>
          <h1>Catálogo de itens</h1>
          <p>Itens extras que poderão ser contratados pelos expositores. O preço aqui é sempre o valor atual.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setImportOpen(true)}>Importar planilha</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Novo item</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input"><span className="ic">🔍</span>
              <input placeholder="Buscar por nome, código ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Categoria (todas)</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Disponibilidade (todas)</option><option value="active">Disponível</option><option value="inactive">Indisponível</option>
            </select>
          </div>
          <div className="flex gap-8 items-center">
            {selected.size > 0 ? (
              <>
                <span className="text-sm text-muted">{selected.size} selecionado(s)</span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleBulk(true)}>Ativar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleBulk(false)}>Desativar</button>
              </>
            ) : <span className="text-sm text-muted">{filtered.length} item(ns)</span>}
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((i) => i.id)) : new Set())} />
                </th>
                <th>Código</th><th>Item</th><th>Categoria</th><th>Preço</th><th>Unidade</th><th>Disponibilidade</th><th>Exige aprovação</th><th>Atualizado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10}><EmptyState icon="📦" title="Nenhum item encontrado" text="Ajuste os filtros, cadastre um item novo ou importe uma planilha." /></td></tr>}
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="col-check">
                    <input type="checkbox" checked={selected.has(i.id)} onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(i.id); else next.delete(i.id);
                      setSelected(next);
                    }} />
                  </td>
                  <td className="table-name">{i.code}</td>
                  <td><div className="table-name">{i.name}</div><div className="table-sub">{i.description}</div></td>
                  <td>{i.category}</td>
                  <td className="money">{fmtMoney(i.price)}</td>
                  <td>{BILLING_UNIT_LABEL[i.billingUnit]}</td>
                  <td>{i.active ? <Badge label="Disponível" tone="success" /> : <Badge label="Indisponível" tone="neutral" />}</td>
                  <td>{i.requiresApproval ? <Badge label="Sim" tone="warning" /> : <Badge label="Não" tone="neutral" />}</td>
                  <td>{fmtDateShort(i.updatedAt)}</td>
                  <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(i)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} title={editing ? `Editar item · ${editing.name}` : 'Novo item de catálogo'} onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="item-form" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar item'}</button></>}>
        <form id="item-form" className="flex-col gap-16" onSubmit={handleSubmit}>
          {formError && <div className="login-error show">{formError}</div>}
          <div className="form-grid">
            <div className="field"><label>Código <span className="req">*</span></label><input required name="code" defaultValue={editing?.code} placeholder="Ex: MOB-003" /></div>
            <div className="field"><label>Nome <span className="req">*</span></label><input required name="name" defaultValue={editing?.name} /></div>
            <div className="field full"><label>Descrição</label><textarea name="description" defaultValue={editing?.description} /></div>
            <div className="field"><label>Categoria</label>
              <select name="category" defaultValue={editing?.category ?? categories[0]}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="field"><label>Unidade de cobrança</label>
              <select name="billingUnit" defaultValue={editing?.billingUnit ?? 'UNIT'}>{BILLING_UNITS.map((u) => <option key={u} value={u}>{BILLING_UNIT_LABEL[u]}</option>)}</select></div>
            <div className="field"><label>Preço (R$) <span className="req">*</span></label><input required type="number" min={0} step="0.01" name="price" defaultValue={editing?.price} /></div>
            <div className="field"><label>Qtd. mínima</label><input type="number" min={1} name="minQty" defaultValue={editing?.minQty ?? 1} /></div>
            <div className="field"><label>Qtd. máxima</label><input type="number" min={1} name="maxQty" defaultValue={editing?.maxQty ?? 10} /></div>
            <div className="field"><label>Exige aprovação DASH</label>
              <select name="requiresApproval" defaultValue={String(editing?.requiresApproval ?? false)}><option value="false">Não</option><option value="true">Sim</option></select></div>
            <div className="field"><label>Disponibilidade</label>
              <select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Disponível</option><option value="false">Indisponível</option></select></div>
          </div>
        </form>
      </Drawer>

      <ImportWizard eventId={eventId} open={importOpen} onClose={() => setImportOpen(false)} toast={toast} onApplied={() => router.refresh()} />
    </>
  );
}

/* ---------------------------- Wizard de importação --------------------------- */

function ImportWizard({ eventId, open, onClose, toast, onApplied }: {
  eventId: string; open: boolean; onClose: () => void; toast: (m: string, t?: 'success' | 'error') => void; onApplied: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<unknown[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() { setStep(1); setFileName(''); setRawRows([]); setPreview(null); onClose(); }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    setRawRows(rows);
  }

  async function handleValidate() {
    if (rawRows.length === 0) { toast('Selecione um arquivo XLSX ou CSV válido.', 'error'); return; }
    setLoading(true);
    const result = await previewCatalogImportAction(eventId, rawRows);
    setLoading(false);
    setPreview(result);
    setStep(2);
  }

  async function handleApply() {
    if (!preview) return;
    setLoading(true);
    const result = await applyCatalogImportAction(eventId, fileName, preview);
    setLoading(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Importação aplicada com sucesso.', 'success');
    onApplied();
    reset();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      { code: 'MOB-003', name: 'Puff', description: 'Puff para lounge', category: 'Mobiliário', price: 120, billing_unit: 'UNIT', minimum_quantity: 1, maximum_quantity: 20, allows_quantity: true, requires_dash_approval: false, active: true },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'catalogo');
    XLSX.writeFile(wb, 'catalog-template.xlsx');
  }

  return (
    <Drawer open={open} title={`Importar catálogo · Etapa ${step} de 3`} onClose={reset}
      footer={
        step === 1 ? <><button className="btn btn-secondary" onClick={reset}>Cancelar</button><button className="btn btn-primary" onClick={handleValidate} disabled={loading}>{loading ? 'Validando...' : 'Validar arquivo'}</button></>
        : step === 2 ? <><button className="btn btn-secondary" onClick={reset}>Cancelar</button><button className="btn btn-primary" onClick={() => setStep(3)} disabled={(preview?.comErro ?? 0) > 0}>Ver mudanças e confirmar</button></>
        : <><button className="btn btn-secondary" onClick={() => setStep(2)}>Voltar</button><button className="btn btn-primary" onClick={handleApply} disabled={loading}>{loading ? 'Aplicando...' : 'Aplicar alterações'}</button></>
      }
    >
      {step === 1 && (
        <div className="flex-col gap-16">
          <p className="text-secondary text-sm">Envie uma planilha XLSX ou CSV seguindo o template. Nada é gravado até a confirmação final.</p>
          <div className="field"><label>Arquivo</label><input type="file" accept=".xlsx,.csv" onChange={handleFile} /></div>
          {fileName && <p className="text-sm text-muted">Selecionado: {fileName} ({rawRows.length} linha(s) lida(s))</p>}
          <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={downloadTemplate}>⬇ Baixar template (catalog-template.xlsx)</button>
        </div>
      )}
      {step === 2 && preview && (
        <div className="flex-col gap-16">
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat-card"><div className="label">Analisados</div><div className="value">{preview.total}</div></div>
            <div className="stat-card accent-success"><div className="label">Sem erro</div><div className="value">{preview.total - preview.comErro}</div></div>
            <div className="stat-card"><div className="label">Com erro</div><div className="value">{preview.comErro}</div></div>
          </div>
          {preview.comErro > 0 && (
            <div className="table-wrap"><div className="table-scroll"><table className="data-table">
              <thead><tr><th>Código</th><th>Erro</th></tr></thead>
              <tbody>{preview.rows.filter((r) => r.situation === 'ERROR').map((r, idx) => (
                <tr key={idx}><td>{(r.row as { code?: string })?.code ?? '—'}</td><td className="text-danger">{r.error}</td></tr>
              ))}</tbody>
            </table></div></div>
          )}
        </div>
      )}
      {step === 3 && preview && (
        <div className="flex-col gap-16">
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="stat-card"><div className="label">Sem alteração</div><div className="value">{preview.semAlteracao}</div></div>
            <div className="stat-card accent-pink"><div className="label">Atualizados</div><div className="value">{preview.atualizados}</div></div>
            <div className="stat-card"><div className="label">Novos</div><div className="value">{preview.novos}</div></div>
            <div className="stat-card"><div className="label">Com erro</div><div className="value">{preview.comErro}</div></div>
          </div>
          <div className="table-wrap"><div className="table-scroll"><table className="data-table">
            <thead><tr><th>Item</th><th>Situação</th><th>Valor atual</th><th></th><th>Novo valor</th></tr></thead>
            <tbody>
              {preview.rows.filter((r) => r.situation === 'UPDATED' || r.situation === 'NEW').map((r, idx) => (
                <tr key={idx}>
                  <td>{r.row.name}</td>
                  <td><Badge label={r.situation === 'NEW' ? 'Novo' : 'Atualizado'} tone={r.situation === 'NEW' ? 'info' : 'warning'} /></td>
                  <td className="money">{r.existing ? fmtMoney(r.existing.price) : '—'}</td><td>→</td>
                  <td className="money">{fmtMoney(r.row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
          <p className="text-sm text-muted">Pedidos já contratados mantêm o preço no momento da contratação (snapshot) — a importação nunca altera valores retroativamente.</p>
        </div>
      )}
    </Drawer>
  );
}
