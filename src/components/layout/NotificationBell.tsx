'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate } from '@/utils/format';
import type { AdminAlert } from '@/modules/alerts/queries';

const ALERT_ICON: Record<AdminAlert['type'], string> = {
  CADASTRO: '📋', EXTRA: '📦', EQUIPE: '👥', DOCUMENTO: '📄', PAGAMENTO: '💳', DISCUSSAO: '💬',
};

export function NotificationBell({ alerts }: { alerts: AdminAlert[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const top = alerts.slice(0, 7);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-icon btn-ghost" aria-label="Notificações" aria-expanded={open}
        onClick={() => setOpen((v) => !v)} style={{ position: 'relative' }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {alerts.length > 0 && <span className="pill-count notif-badge">{alerts.length > 99 ? '99+' : alerts.length}</span>}
      </button>

      {open && (
        <div className="notif-popover" role="dialog" aria-label="Notificações">
          <div className="notif-header">
            <strong>Notificações</strong>
            <span className="text-sm text-muted">{alerts.length} pendente(s)</span>
          </div>
          <div className="notif-list">
            {top.length === 0 ? (
              <div className="notif-empty">Tudo em dia — nenhuma pendência no momento.</div>
            ) : (
              top.map((a) => (
                <button key={a.id} className="notif-item" onClick={() => handleSelect(a.href)}>
                  <span className="notif-icon" aria-hidden="true">{ALERT_ICON[a.type]}</span>
                  <span className="notif-body">
                    <span className="notif-title">{a.title}</span>
                    <span className="notif-detail">{a.supplierName} · {a.detail}</span>
                    <span className="notif-time">{fmtDate(a.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          {alerts.length > 7 && (
            <div className="notif-footer">
              <button className="widget-link" onClick={() => handleSelect('/admin/notificacoes')}>Ver todas as notificações →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
