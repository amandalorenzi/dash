import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentEventId } from '@/lib/event-context';
import { getAdminAlerts } from '@/modules/alerts/queries';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/Badge';
import { fmtDate } from '@/utils/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ALERT_ICON: Record<string, string> = {
  CADASTRO: '📋', EXTRA: '📦', EQUIPE: '👥', DOCUMENTO: '📄', PAGAMENTO: '💳', DISCUSSAO: '💬',
};

export default async function NotificacoesPage() {
  const user = (await getCurrentUser())!;
  const eventId = await getCurrentEventId();
  const alerts = eventId ? await getAdminAlerts(eventId) : [];

  return (
    <AppShell active="notificacoes" user={user}>
      <div className="page-header">
        <div>
          <h1>Notificações</h1>
          <p>Tudo o que aguarda alguma ação da DASH neste evento. Um item some daqui assim que é resolvido.</p>
        </div>
      </div>

      <div className="table-wrap">
        {alerts.length === 0 ? (
          <div className="card-body"><EmptyState icon="🔔" title="Tudo em dia" text="Nenhuma pendência no momento." /></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th></th><th>Alerta</th><th>Expositor</th><th>Detalhe</th><th>Quando</th><th></th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 17 }}>{ALERT_ICON[a.type] ?? '🔔'}</td>
                    <td className="table-name">{a.title}</td>
                    <td>{a.supplierName}</td>
                    <td className="text-secondary text-sm">{a.detail}</td>
                    <td className="text-sm text-muted">{fmtDate(a.createdAt)}</td>
                    <td><Link href={a.href} className="btn btn-ghost btn-sm">Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
