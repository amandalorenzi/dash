'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Seletor de emojis simples, sem dependência externa: uma lista curada por
 * categoria, inserida na posição do cursor do textarea alvo.
 */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Frequentes', emojis: ['📣', '✅', '⚠️', '📅', '⏰', '📌', '🎉', '👏', '🙏', '🔔', '📎', '✏️'] },
  { label: 'Rostos', emojis: ['😀', '😊', '😉', '🙂', '😅', '🤝', '👍', '👌', '💪', '🫡', '🤔', '😎'] },
  { label: 'Evento', emojis: ['🎪', '🏟️', '🎤', '🎬', '🪑', '💡', '🔌', '🧹', '🌐', '🧾', '💳', '🚚'] },
  { label: 'Status', emojis: ['🟢', '🟡', '🔴', '❗', '❓', '⭐', '🔥', '📈', '📉', '🕐', '🚀', '🏁'] },
];

export function EmojiPicker({ targetId, onInsert }: { targetId?: string; onInsert?: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  function insert(emoji: string) {
    if (onInsert) { onInsert(emoji); setOpen(false); return; }
    if (!targetId) return;
    const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
    const caret = start + emoji.length;
    el.setSelectionRange(caret, caret);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button" className="btn btn-secondary btn-sm" aria-label="Inserir emoji"
        aria-expanded={open} onClick={() => setOpen((v) => !v)}
      >
        🙂 Emoji
      </button>

      {open && (
        <div
          role="dialog" aria-label="Selecionar emoji"
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-pop)', padding: 12, width: 260, maxHeight: 280, overflowY: 'auto',
          }}
        >
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>
                {group.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}>
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji} type="button" onClick={() => insert(emoji)} aria-label={`Inserir ${emoji}`}
                    style={{ fontSize: 18, lineHeight: '28px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
