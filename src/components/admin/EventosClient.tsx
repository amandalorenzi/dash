'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Drawer, ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtDateShort } from '@/utils/format';
import {
  createEventAction, updateEventAction, addSharedDocumentAction, removeSharedDocumentAction,
} from '@/modules/events/actions';
import { createDeadlineAction, deleteDeadlineAction } from '@/modules/deadlines/actions';
import { uploadFile, buildUploadPath, fileSizeMb } from '@/lib/firebase/storage';
import type { FirestoreEvent, Deadline } from '@/types/domain';

export function EventosClient({ events, currentEventId, deadlinesByEvent }: { events: FirestoreEvent[]; currentEventId: string | null; deadlinesByEvent: Record<string, Deadline[]> }) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FirestoreEvent | null>(null);
  const [docsFor, setDocsFor] = useState<FirestoreEvent | null>(null);
  const [deadlinesFor, setDeadlinesFor] = useState<FirestoreEvent | null>(null);
  const [removingDeadline, setRemovingDeadline] = useState<Deadline | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removingDoc, setRemovingDoc] = useState<{ eventId: string; docId: string; name: string } | null>(null);

  function openCreate() { setEditing(null); setFormError(null); setDrawerOpen(true); }
  function openEdit(e: FirestoreEvent) { setEditing(e); setFormError(null); setDrawerOpen(true); }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      local: String(fd.get('local') || ''),
      dataInicio: String(fd.get('dataInicio') || ''),
      dataFim: String(fd.get('dataFim') || ''),
      endereco: {
        logradouro: String(fd.get('logradouro') || ''), numero: String(fd.get('numero') || ''),
        bairro: String(fd.get('bairro') || ''), cidade: String(fd.get('cidade') || ''),
        estado: String(fd.get('estado') || ''), cep: String(fd.get('cep') || ''),
      },
      horario: String(fd.get('horario') || ''),
      tagline: String(fd.get('tagline') || ''),
      bannerUrl: String(fd.get('bannerUrl') || ''),
      logoUrl: String(fd.get('logoUrl') || ''),
      floorPlanUrl: String(fd.get('floorPlanUrl') || ''),
      orderDeadline: String(fd.get('orderDeadline') || ''),
      guideContent: String(fd.get('guideContent') || ''),
      maxUploadSizeMb: Number(fd.get('maxUploadSizeMb') || 2),
    };

    const result = editing ? await updateEventAction(editing.id, payload) : await createEventAction(payload);
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    toast(editing ? 'Evento atualizado.' : 'Evento criado com categorias iniciais.', 'success');
    setDrawerOpen(false);
    router.refresh();
  }

  async function handleAddDoc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!docsFor) return;
    const fd = new FormData(e.currentTarget);
    const result = await addSharedDocumentAction(docsFor.id, { name: fd.get('docName'), url: fd.get('docUrl') });
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Documento adicionado.', 'success');
    setDocsFor(null);
    router.refresh();
  }

  async function handleRemoveDoc() {
    if (!removingDoc) return;
    const result = await removeSharedDocumentAction(removingDoc.eventId, removingDoc.docId);
    setRemovingDoc(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Documento removido.', 'success');
    router.refresh();
  }

  async function handleAddDeadline(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deadlinesFor) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = await createDeadlineAction(deadlinesFor.id, { titulo: fd.get('titulo'), descricao: fd.get('descricao'), dataLimite: fd.get('dataLimite') });
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Prazo adicionado.', 'success');
    form.reset();
    router.refresh();
  }

  async function handleUploadEventDoc(e: React.ChangeEvent<HTMLInputElement>, event: FirestoreEvent | null) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !event) return;

    const maxMb = event.maxUploadSizeMb ?? 2;
    if (fileSizeMb(file) > maxMb) {
      toast(`Arquivo muito grande. O limite deste evento é ${maxMb}MB.`, 'error');
      return;
    }

    setUploadingDoc(true);
    try {
      const path = buildUploadPath('event-documents', event.id, file.name);
      const { url } = await uploadFile(path, file);
      const result = await addSharedDocumentAction(event.id, { name: file.name, url });
      if (!result.ok) { toast(result.error, 'error'); return; }
      toast('Documento enviado.', 'success');
      router.refresh();
    } catch {
      toast('Falha ao enviar o arquivo.', 'error');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleRemoveDeadline() {
    if (!removingDeadline) return;
    const result = await deleteDeadlineAction(removingDeadline.id);
    setRemovingDeadline(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Prazo removido.', 'success');
    router.refresh();
  }

  return (
    <>
      <ToastHost />
      <div className="page-header">
        <div>
          <h1>Eventos</h1>
          <p>Crie e configure os eventos. O evento selecionado no topo define o que aparece nas demais telas.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>+ Novo evento</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Evento</th><th>Local</th><th>Período</th><th>Prazo de pedidos</th><th>Documentos</th><th></th></tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={6}><EmptyState icon="📅" title="Nenhum evento cadastrado" text="Crie o primeiro evento para começar a cadastrar expositores e o catálogo." /></td></tr>
              )}
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="table-name">{e.name} {e.id === currentEventId && <Badge label="Atual" tone="info" />}</div>
                    <div className="table-sub">{e.endereco?.cidade ? `${e.endereco.cidade}/${e.endereco.estado}` : ''}</div>
                  </td>
                  <td>{e.local || '—'}</td>
                  <td>{fmtDateShort(e.dataInicio)} — {fmtDateShort(e.dataFim)}</td>
                  <td>{e.orderDeadline ? fmtDateShort(e.orderDeadline) : <span className="text-muted">sem prazo</span>}</td>
                  <td>{(e.sharedDocuments ?? []).length}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>Configurar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeadlinesFor(e)}>Prazos</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDocsFor(e)}>Documentos</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editing ? `Configurar · ${editing.name}` : 'Novo evento'}
        onClose={() => setDrawerOpen(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancelar</button><button form="event-form" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar evento'}</button></>}
      >
        <form id="event-form" className="flex-col gap-16" onSubmit={handleSubmit}>
          {formError && <div className="login-error show">{formError}</div>}
          <fieldset>
            <legend>Informações gerais</legend>
            <div className="form-grid">
              <div className="field full"><label>Nome do evento <span className="req">*</span></label><input required name="name" defaultValue={editing?.name} /></div>
              <div className="field full"><label>Local / pavilhão</label><input name="local" defaultValue={editing?.local} /></div>
              <div className="field"><label>Data de início <span className="req">*</span></label><input required type="date" name="dataInicio" defaultValue={editing?.dataInicio} /></div>
              <div className="field"><label>Data de término <span className="req">*</span></label><input required type="date" name="dataFim" defaultValue={editing?.dataFim} /></div>
              <div className="field"><label>Horário</label><input name="horario" placeholder="Ex: 9h às 19h" defaultValue={editing?.horario} /></div>
              <div className="field"><label>Tagline</label><input name="tagline" placeholder="Ex: Pessoas. Propósito. Possibilidades." defaultValue={editing?.tagline} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Identidade visual do evento</legend>
            <div className="form-grid">
              <div className="field full">
                <label>Logo do evento (link)</label>
                <input type="url" name="logoUrl" placeholder="https://..." defaultValue={editing?.logoUrl} />
                <p className="help">Aparece no topo do portal do expositor. Sem logo, o nome do evento é usado.</p>
              </div>
              <div className="field full">
                <label>Banner de fundo (link)</label>
                <input type="url" name="bannerUrl" placeholder="https://..." defaultValue={editing?.bannerUrl} />
              </div>
              <div className="field full">
                <label>Planta do evento (link)</label>
                <input type="url" name="floorPlanUrl" placeholder="https://..." defaultValue={editing?.floorPlanUrl} />
                <p className="help">Link para o mapa/planta. O expositor acessa pelo card &quot;Seu stand&quot;.</p>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Endereço</legend>
            <div className="form-grid cols-3">
              <div className="field"><label>Logradouro</label><input name="logradouro" defaultValue={editing?.endereco?.logradouro} /></div>
              <div className="field"><label>Número</label><input name="numero" defaultValue={editing?.endereco?.numero} /></div>
              <div className="field"><label>Bairro</label><input name="bairro" defaultValue={editing?.endereco?.bairro} /></div>
              <div className="field"><label>Cidade</label><input name="cidade" defaultValue={editing?.endereco?.cidade} /></div>
              <div className="field"><label>Estado</label><input name="estado" maxLength={2} defaultValue={editing?.endereco?.estado} /></div>
              <div className="field"><label>CEP</label><input name="cep" defaultValue={editing?.endereco?.cep} /></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Prazos e manual</legend>
            <div className="form-grid">
              <div className="field full">
                <label>Prazo final para envio de pedidos</label>
                <input type="date" name="orderDeadline" defaultValue={editing?.orderDeadline ?? ''} />
                <p className="help">Depois desta data, os expositores deixam de conseguir solicitar novos extras pelo portal.</p>
              </div>
              <div className="field full">
                <label>Manual / guia do expositor</label>
                <textarea name="guideContent" rows={8} defaultValue={editing?.guideContent} placeholder="Escreva aqui as orientações que o expositor verá no portal (horários de montagem, regras, contatos...)" />
              </div>
              <div className="field">
                <label>Tamanho máximo de upload (MB)</label>
                <input type="number" min={1} max={9} name="maxUploadSizeMb" defaultValue={editing?.maxUploadSizeMb ?? 2} />
                <p className="help">Vale para documentos enviados por expositores e pela DASH neste evento. Padrão: 2MB.</p>
              </div>
            </div>
          </fieldset>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(docsFor)}
        title={`Documentos compartilhados · ${docsFor?.name ?? ''}`}
        onClose={() => setDocsFor(null)}
        footer={<><button className="btn btn-secondary" onClick={() => setDocsFor(null)}>Fechar</button><button form="doc-form" className="btn btn-primary">Adicionar documento</button></>}
      >
        <div className="flex-col gap-16">
          <p className="text-secondary text-sm">
            Documentos são cadastrados como nome + link (Google Drive, Dropbox, etc.) e ficam visíveis para todos os
            expositores deste evento na aba &quot;Manual do expositor&quot;.
          </p>
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Documento</th><th></th></tr></thead>
                <tbody>
                  {(docsFor?.sharedDocuments ?? []).length === 0 && (
                    <tr><td colSpan={2}><EmptyState icon="📎" title="Nenhum documento" text="Adicione o primeiro link abaixo." /></td></tr>
                  )}
                  {(docsFor?.sharedDocuments ?? []).map((d) => (
                    <tr key={d.id}>
                      <td><a href={d.url} target="_blank" rel="noopener noreferrer" className="table-name">{d.name}</a></td>
                      <td className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setRemovingDoc({ eventId: docsFor!.id, docId: d.id, name: d.name })}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <form id="doc-form" className="flex-col gap-12" onSubmit={handleAddDoc}>
            <div className="field"><label>Nome do documento <span className="req">*</span></label><input required name="docName" placeholder="Ex: Manual de montagem 2026" /></div>
            <div className="field"><label>Link <span className="req">*</span></label><input required name="docUrl" type="url" placeholder="https://..." /></div>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Prefere enviar um arquivo em vez de colar um link? Use o campo abaixo — ele preenche o link automaticamente.
            </p>
            <div className="field">
              <label>Ou envie um arquivo (máx. {docsFor?.maxUploadSizeMb ?? 2}MB)</label>
              <input type="file" onChange={(e) => handleUploadEventDoc(e, docsFor)} disabled={uploadingDoc} />
              {uploadingDoc && <p className="help">Enviando arquivo...</p>}
            </div>
          </form>
        </div>
      </Drawer>

      <Drawer
        open={Boolean(deadlinesFor)}
        title={`Prazos · ${deadlinesFor?.name ?? ''}`}
        onClose={() => setDeadlinesFor(null)}
        footer={<><button className="btn btn-secondary" onClick={() => setDeadlinesFor(null)}>Fechar</button><button form="deadline-form" className="btn btn-primary">Adicionar prazo</button></>}
      >
        <div className="flex-col gap-16">
          <p className="text-secondary text-sm">
            Estes prazos aparecem no widget &quot;Próximos prazos&quot; do portal do expositor, junto com o prazo final
            de pedidos configurado na aba principal (quando definido).
          </p>
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Prazo</th><th>Data</th><th></th></tr></thead>
                <tbody>
                  {(deadlinesFor ? (deadlinesByEvent[deadlinesFor.id] ?? []) : []).length === 0 && (
                    <tr><td colSpan={3}><EmptyState icon="⏰" title="Nenhum prazo cadastrado" text="Adicione o primeiro abaixo." /></td></tr>
                  )}
                  {(deadlinesFor ? (deadlinesByEvent[deadlinesFor.id] ?? []) : []).map((d) => (
                    <tr key={d.id}>
                      <td><div className="table-name">{d.titulo}</div>{d.descricao && <div className="table-sub">{d.descricao}</div>}</td>
                      <td>{fmtDateShort(d.dataLimite)}</td>
                      <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => setRemovingDeadline(d)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <form id="deadline-form" className="flex-col gap-12" onSubmit={handleAddDeadline}>
            <div className="field"><label>Título <span className="req">*</span></label><input required name="titulo" placeholder="Ex: Envio dos documentos obrigatórios" /></div>
            <div className="field"><label>Data limite <span className="req">*</span></label><input required type="date" name="dataLimite" /></div>
            <div className="field"><label>Descrição</label><textarea name="descricao" rows={2} /></div>
          </form>
        </div>
      </Drawer>

      <ConfirmModal
        open={Boolean(removingDeadline)}
        title="Remover prazo"
        message={`"${removingDeadline?.titulo}" deixará de aparecer para os expositores.`}
        confirmLabel="Remover" danger
        onCancel={() => setRemovingDeadline(null)}
        onConfirm={handleRemoveDeadline}
      />

      <ConfirmModal
        open={Boolean(removingDoc)}
        title="Remover documento"
        message={`"${removingDoc?.name}" deixará de aparecer para os expositores.`}
        confirmLabel="Remover" danger
        onCancel={() => setRemovingDoc(null)}
        onConfirm={handleRemoveDoc}
      />
    </>
  );
}
