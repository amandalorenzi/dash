'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtDate } from '@/utils/format';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { Avatar } from '@/components/ui/Avatar';
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
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  async function handlePublish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSaving(true);
    const result = await publishEventUpdateAction(eventId, message, String(fd.get('title') || ''));
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Comunicado publicado.', 'success');
    form.reset();
    setMessage('');
    router.refresh();
  }

  function insertEmoji(emoji: string) {
    const el = messageRef.current;
    if (!el) { setMessage((m) => m + emoji); return; }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
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
            <input name="title" maxLength={120} placeholder="Título do comunicado (opcional)" />
            <textarea
              ref={messageRef}
              rows={3} required maxLength={2000}
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva um anúncio, lembrete ou aviso para todos os expositores deste evento..."
            />
            <div className="flex gap-8 items-center">
              <EmojiPicker onInsert={insertEmoji} />
              <button className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Publicando...' : 'Publicar comunicado'}
              </button>
              <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{message.length}/2000</span>
            </div>
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
                    <div className="flex items-center gap-8">
                      <Avatar name={u.authorName} url={u.authorAvatarUrl} size={28} />
                      <strong style={{ fontSize: 13 }}>{u.authorName}</strong>
                    </div>
                    <span className="text-sm text-muted">{fmtDate(u.createdAt)}</span>
                  </div>
                  {u.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{u.title}</div>}
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
