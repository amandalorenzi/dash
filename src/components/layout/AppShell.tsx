import Link from 'next/link';
import { listEvents } from '@/modules/events/queries';
import { getCurrentEventId } from '@/lib/event-context';
import { EventSwitcher, LogoutTrigger, MobileMenuToggle } from '@/components/layout/TopbarClient';
import { ROLE_LABEL } from '@/config/labels';
import type { UserProfile } from '@/types/domain';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/admin/dashboard', icon: '▦', label: 'Dashboard' },
  { key: 'expositores', href: '/admin/expositores', icon: '🏷', label: 'Expositores' },
  { key: 'catalogo', href: '/admin/catalogo', icon: '▤', label: 'Catálogo de itens' },
];

const CONFIG_ITEMS = [
  { key: 'eventos', href: '/admin/eventos', icon: '📅', label: 'Eventos' },
  { key: 'categorias', href: '/admin/categorias', icon: '🗂', label: 'Categorias' },
  { key: 'usuarios', href: '/admin/usuarios', icon: '👤', label: 'Usuários' },
];

export async function AppShell({ active, user, children }: { active: string; user: UserProfile; children: React.ReactNode }) {
  const events = await listEvents();
  const currentEventId = await getCurrentEventId();

  return (
    <div className="app-shell">
      <div className="sidebar" id="sidebar">
        <div className="sidebar-brand">
          <div>
            <strong>dash<span className="logo-dot">.</span></strong>
            <span>GESTÃO DE EXPOSITORES</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Administração</div>
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={`nav-item ${active === item.key ? 'active' : ''}`}>
              <span className="ic">{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="sidebar-section-label">Configurações</div>
          {CONFIG_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={`nav-item ${active === item.key ? 'active' : ''}`}>
              <span className="ic">{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          DASH · Gestão de Expositores<br />
          v1.0.0 · Firebase + Vercel
        </div>
      </div>

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <MobileMenuToggle />
            <EventSwitcher events={events.map((e) => ({ id: e.id, name: e.name }))} currentEventId={currentEventId} />
          </div>
          <div className="topbar-right">
            <LogoutTrigger userName={user.name} roleLabel={ROLE_LABEL[user.role]} />
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
