'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { ConfirmModal } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/useToast';
import { fmtDate } from '@/utils/format';
import { postDiscussionMessageAction, deleteDiscussionMessageAction } from '@/modules/discussions/actions';
import type { DiscussionMessage } from '@/types/domain';

/**
 * Conversa entre a equipe DASH e um expositor.
 * `viewerSide` define de que lado as mensagens próprias aparecem alinhadas.
 */
export function DiscussionPanel({ supplierId, messages, viewerSide, canDelete }: {
  supplierId: string; messages: DiscussionMessage[]; viewerSide: 'DASH' | 'EXPOSITOR'; canDelete?: boolean;
}) {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<DiscussionMessage | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const result = await postDiscussionMessageAction(supplierId, text);
    setSaving(false);
    if (!result.ok) { toast(result.error, 'error'); return; }
    setText('');
    router.refresh();
  }

  function insertEmoji(emoji: string) {
    const el = textRef.current;
    if (!el) { setText((t) => t + emoji); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function handleRemove() {
    if (!removing) return;
    const result = await deleteDiscussionMessageAction(removing.id, supplierId);
    setRemoving(null);
    if (!result.ok) { toast(result.error, 'error'); return; }
    toast('Mensagem removida.', 'success');
    router.refresh();
  }

  return (
    <div className="card">
      <ToastHost />
      <div className="card-header">
        <h3>Discussão</h3>
        <span className="text-sm text-muted">{messages.length} mensagem(ns)</span>
      </div>
      <div className="card-body flex-col gap-16">
        {messages.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Nenhuma mensagem ainda"
            text={viewerSide === 'DASH'
              ? 'Use este espaço para falar diretamente com este expositor.'
              : 'Use este espaço para falar com a produção da DASH.'}
          />
        ) : (
          <div className="flex-col gap-12" style={{ maxHeight: 460, overflowY: 'auto' }}>
            {messages.map((m) => {
              const isMine = m.authorSide === viewerSide;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 8, maxWidth: '78%', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    <Avatar name={m.authorName} url={m.authorAvatarUrl} size={30} />
                    <div
                      style={{
                        background: isMine ? 'var(--purple-050)' : '#F4F6FB',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px',
                      }}
                    >
                      <div className="flex items-center gap-8 mb-8" style={{ justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12.5 }}>
                          {m.authorName}
                          <span className="text-muted" style={{ fontWeight: 400 }}>
                            {' '}· {m.authorSide === 'DASH' ? 'DASH' : 'Expositor'}
                          </span>
                        </strong>
                        <span className="text-sm text-muted">{fmtDate(m.createdAt)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                      {canDelete && (
                        <button className="btn btn-ghost btn-sm mt-8" onClick={() => setRemoving(m)}>Remover</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form className="flex-col gap-8" onSubmit={handleSend}>
          <textarea
            ref={textRef} rows={3} maxLength={4000} value={text} required
            onChange={(e) => setText(e.target.value)}
            placeholder={viewerSide === 'DASH' ? 'Escreva uma mensagem para este expositor...' : 'Escreva uma mensagem para a produção da DASH...'}
          />
          <div className="flex gap-8 items-center">
            <EmojiPicker onInsert={insertEmoji} />
            <button className="btn btn-primary btn-sm" disabled={saving || !text.trim()}>
              {saving ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={Boolean(removing)} title="Remover mensagem"
        message="A mensagem será removida da conversa para os dois lados."
        confirmLabel="Remover" danger
        onCancel={() => setRemoving(null)} onConfirm={handleRemove}
      />
    </div>
  );
}
