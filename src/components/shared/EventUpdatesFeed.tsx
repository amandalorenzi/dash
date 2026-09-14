'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtDate } from '@/utils/format';
import { publishEventUpdateAction, deleteEventUpdateAction } from '@/modules/events/actions';
import type { EventUpdate } from '@/types/domain';

/** `canPublish` distingue o uso no admin (publica) do uso no portal (só leitura). */
export function EventUpdatesFeed({ eventId, updates, canPublish, canDelete }: {
  eventId: string; updates: EventUpdate[]; canPublish: boolean; canDelete?: boolean;
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<EventUpdate | null>(null);

  async function handlePublish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSaving(true);
    const result = await publishEventUpdateAction(eventId, String(fd.get('message') || ''));
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Comunicado publicado.', 'success');
    form.reset();
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    const result = await deleteEventUpdateAction(removing.id);
    setRemoving(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Comunicado removido.', 'success');
    router.refresh();
  }

  return (
    <div className="card">
      <ToastHost />
      <div className="card-header">
        <h3>{canPublish ? 'Updates do evento' : 'Updates do evento'}</h3>
        <span className="text-sm text-muted">{updates.length} comunicado(s)</span>
      </div>
      <div className="card-body flex-col gap-16">
        {canPublish && (
          <form className="flex-col gap-8" onSubmit={handlePublish}>
            <textarea
              name="message" rows={3} required maxLength={2000}
              placeholder="Escreva um anúncio, lembrete ou aviso para todos os expositores deste evento..."
            />
            <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={saving}>
              {saving ? 'Publicando...' : 'Publicar comunicado'}
            </button>
          </form>
        )}

        {updates.length === 0 ? (
          <EmptyState
            icon="📣"
            title="Nenhum comunicado ainda"
            text={canPublish ? 'Publique o primeiro aviso acima — ele aparece no portal de todos os expositores.' : 'Quando a produção publicar avisos, eles aparecerão aqui.'}
          />
        ) : (
          <div className="flex-col gap-12">
            {updates.map((u) => (
              <div key={u.id} className="card" style={{ boxShadow: 'none', background: '#FAFBFE' }}>
                <div className="card-body" style={{ padding: '14px 16px' }}>
                  <div className="flex justify-between items-center mb-8" style={{ gap: 12 }}>
                    <strong style={{ fontSize: 13 }}>{u.authorName}</strong>
                    <span className="text-sm text-muted">{fmtDate(u.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{u.message}</p>
                  {canDelete && (
                    <button className="btn btn-ghost btn-sm mt-8" onClick={() => setRemoving(u)}>Remover</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(removing)} title="Remover comunicado"
        message="O comunicado deixará de aparecer para os expositores."
        confirmLabel="Remover" danger
        onCancel={() => setRemoving(null)} onConfirm={handleRemove}
      />
    </div>
  );
}
