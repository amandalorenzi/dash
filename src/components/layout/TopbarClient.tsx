'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';

export function LogoutTrigger({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    try { await signOut(getFirebaseAuthClient()); } catch { /* noop */ }
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <div className="user-chip" id="user-chip" onClick={() => setConfirming(true)}>
        <div className="avatar">{initials(userName)}</div>
        <div>
          <span className="name">{userName}</span>
          <span className="role">{roleLabel}</span>
        </div>
      </div>

      {confirming && (
        <div className="overlay open" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirming(false); }}>
          <div className="modal">
            <h3>Sair da conta</h3>
            <p>Deseja encerrar a sessão de {userName}?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirming(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleLogout}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function EventSwitcher({ events, currentEventId }: { events: { id: string; name: string }[]; currentEventId: string | null }) {
  const router = useRouter();
  const current = events.find((e) => e.id === currentEventId) ?? events[0];

  async function handleChange(eventId: string) {
    await fetch('/api/events/switch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }),
    });
    router.refresh();
  }

  if (events.length <= 1) {
    return (
      <div className="event-switcher" style={{ cursor: 'default' }}>
        <div><small>Evento atual</small>{current?.name ?? 'Nenhum evento'}</div>
      </div>
    );
  }

  return (
    <div className="event-switcher-group">
      <label htmlFor="event-switcher-select" className="event-switcher-label">Evento atual</label>
      <select
        id="event-switcher-select"
        className="event-switcher"
        style={{ appearance: 'none', fontFamily: 'inherit' }}
        value={current?.id}
        onChange={(e) => handleChange(e.target.value)}
      >
        {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
    </div>
  );
}

export function MobileMenuToggle() {
  return (
    <button className="menu-toggle" onClick={() => document.getElementById('sidebar')?.classList.toggle('open')}>☰</button>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
