'use client';

import { StatusBadge, Badge, EmptyState } from '@/components/ui/Badge';
import { fmtMoney, fmtDateShort } from '@/utils/format';
import {
  STATUS_CADASTRAL_LABEL, STATUS_DASH_LABEL, APPROVAL_STATUS_LABEL, BILLING_UNIT_LABEL,
} from '@/config/labels';
import { calculateOrderItemTotal, type calculateSupplierBalance } from '@/modules/orders/calculations';
import type { Supplier, SupplierOrder, TeamMember, Deadline, EventUpdate, FirestoreEvent } from '@/types/domain';

type Balance = ReturnType<typeof calculateSupplierBalance>;

/* ----------------------------- Seu stand ------------------------------ */
export function StandSummaryCard({ supplier, floorPlanUrl }: { supplier: Supplier; floorPlanUrl?: string }) {
  const metragem = supplier.standMetragem ? `${supplier.standMetragem} m²` : null;
  return (
    <div className="card widget">
      <div className="card-body">
        <div className="widget-head">
          <span className="widget-icon" aria-hidden="true">🏬</span>
          <div>
            <div className="widget-label">Seu stand</div>
            <div className="widget-value">{supplier.standNumero ? `Estande ${supplier.standNumero}` : 'A definir'}</div>
          </div>
        </div>
        <div className="widget-lines">
          {supplier.standLocalizacao && <div>{supplier.standLocalizacao}</div>}
          {metragem && <div>{metragem}</div>}
          {!supplier.standLocalizacao && !metragem && <div className="text-muted">Localização e metragem ainda não informadas.</div>}
        </div>
        {floorPlanUrl && (
          <a className="widget-link" href={floorPlanUrl} target="_blank" rel="noopener noreferrer">Ver planta do evento →</a>
        )}
      </div>
    </div>
  );
}

/* -------------------------- Status do cadastro ------------------------- */
export function RegistrationStatusCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="card widget">
      <div className="card-body">
        <div className="widget-head">
          <span className="widget-icon" aria-hidden="true">📋</span>
          <div className="widget-label">Status do cadastro</div>
        </div>
        <div className="mt-8"><StatusBadge value={supplier.statusCadastral} labelMap={STATUS_CADASTRAL_LABEL} /></div>
        {supplier.updatedAt && (
          <div className="widget-lines mt-8 text-muted">Última atualização em {fmtDateShort(supplier.updatedAt)}</div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Validação DASH ---------------------------- */
export function DashValidationCard({ supplier }: { supplier: Supplier }) {
  const helper: Record<string, string> = {
    VALIDATED: 'Seus documentos e informações estão em conformidade.',
    VERIFIED: 'A DASH conferiu seus dados. A validação final está em andamento.',
    UNDER_REVIEW: 'Sua documentação está sendo analisada pela equipe.',
    PENDING_REVIEW: 'Envie seu cadastro para que a DASH possa analisar.',
    REJECTED: 'Há ajustes solicitados. Veja a aba Cadastro para corrigir.',
  };
  return (
    <div className="card widget">
      <div className="card-body">
        <div className="widget-head">
          <span className="widget-icon" aria-hidden="true">🛡</span>
          <div className="widget-label">Validação DASH</div>
        </div>
        <div className="mt-8"><StatusBadge value={supplier.statusDash} labelMap={STATUS_DASH_LABEL} /></div>
        <div className="widget-lines mt-8 text-secondary">{helper[supplier.statusDash] ?? ''}</div>
      </div>
    </div>
  );
}

/* ------------------------- Contagem regressiva ------------------------- */
export function EventCountdownCard({ event }: { event: FirestoreEvent | null }) {
  if (!event?.dataInicio) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(`${event.dataInicio}T00:00:00`);
  const end = event.dataFim ? new Date(`${event.dataFim}T00:00:00`) : start;
  const days = Math.ceil((start.getTime() - today.getTime()) / 86400000);

  const happening = today >= start && today <= end;
  const finished = today > end;

  // Barra de proximidade: 100% no dia do evento, considerando uma janela de 180 dias.
  const WINDOW = 180;
  const progress = happening || finished ? 100 : Math.max(0, Math.min(100, ((WINDOW - days) / WINDOW) * 100));

  const headline = finished
    ? 'Evento realizado'
    : happening
      ? 'O evento está acontecendo!'
      : days === 0 ? 'O evento começa hoje!'
        : days === 1 ? 'Falta 1 dia para o evento!'
          : `Faltam ${days} dias para o evento!`;

  const cidadeUf = [event.endereco?.cidade, event.endereco?.estado].filter(Boolean).join(' - ');

  return (
    <div className="countdown-card">
      <div className="countdown-head">
        <span className="ic" aria-hidden="true">🗓</span>
        <strong>{headline}</strong>
      </div>
      {!finished && (
        <div className="countdown-bar" role="img" aria-label={`Proximidade do evento: ${Math.round(progress)}%`}>
          <div className="countdown-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="countdown-meta">
        {event.local && <div>{event.local}</div>}
        {cidadeUf && <div>{cidadeUf}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Últimos updates --------------------------- */
export function EventUpdatesWidget({ updates, onSeeAll }: { updates: EventUpdate[]; onSeeAll: () => void }) {
  const latest = updates.slice(0, 3);
  return (
    <div className="card widget">
      <div className="card-header">
        <h3><span aria-hidden="true">📣</span> Últimos updates do evento</h3>
        {updates.length > 0 && <button className="widget-link" onClick={onSeeAll}>Ver todos →</button>}
      </div>
      <div className="card-body">
        {latest.length === 0 ? (
          <EmptyState icon="📣" title="Nenhuma atualização publicada" text="Quando a produção publicar avisos, eles aparecerão aqui." />
        ) : (
          <ul className="update-list">
            {latest.map((u) => {
              const d = new Date(u.createdAt);
              return (
                <li key={u.id}>
                  <div className="update-date" aria-hidden="true">
                    <strong>{d.getDate().toString().padStart(2, '0')}</strong>
                    <span>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</span>
                  </div>
                  <div className="update-body">
                    <div className="update-title">{u.title || u.authorName}</div>
                    <p>{u.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Extras -------------------------------- */
export function ExtrasSummaryWidget({ orders, onSeeAll }: { orders: SupplierOrder[]; onSeeAll: () => void }) {
  const items = orders.flatMap((o) => o.items).slice(0, 4);
  return (
    <div className="card widget">
      <div className="card-header">
        <h3><span aria-hidden="true">📦</span> Seus itens extras</h3>
        {items.length > 0 && <button className="widget-link" onClick={onSeeAll}>Ver todos →</button>}
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <EmptyState icon="📦" title="Você ainda não solicitou itens extras" text="Solicite itens adicionais para o seu estande na aba Extras." />
        ) : (
          <ul className="extras-list">
            {items.map((it) => (
              <li key={it.id}>
                <span className="extras-qty">{String(it.quantity).padStart(2, '0')}</span>
                <span className="extras-name">
                  {it.nameSnapshot}
                  <span className="text-muted text-sm"> · {BILLING_UNIT_LABEL[it.unitSnapshot]}</span>
                </span>
                <span className="money">{fmtMoney(calculateOrderItemTotal(it))}</span>
                <StatusBadge value={it.approvalStatus} labelMap={APPROVAL_STATUS_LABEL} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Equipe -------------------------------- */
export function TeamSummaryWidget({ team, onSeeAll }: { team: TeamMember[]; onSeeAll: () => void }) {
  const approved = team.filter((m) => m.status === 'APPROVED').length;
  const pending = team.filter((m) => (m.status ?? 'PENDING') === 'PENDING').length;
  const rejected = team.filter((m) => m.status === 'REJECTED').length;

  return (
    <div className="card widget">
      <div className="card-header">
        <h3><span aria-hidden="true">👥</span> Equipe</h3>
        {team.length > 0 && <button className="widget-link" onClick={onSeeAll}>Ver todos →</button>}
      </div>
      <div className="card-body">
        {team.length === 0 ? (
          <EmptyState icon="👥" title="Nenhum membro da equipe cadastrado" text="Cadastre quem vai representar seu estande na aba Equipe." />
        ) : (
          <div className="team-counts">
            <div><strong>{team.length}</strong><span>cadastrados</span></div>
            <div><strong>{pending}</strong><span>pendente(s) de aprovação</span></div>
            <div><strong>{rejected}</strong><span>não aprovados</span></div>
          </div>
        )}
        {team.length > 0 && approved > 0 && (
          <div className="mt-8 text-sm text-muted">{approved} credencial(is) já aprovada(s).</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Financeiro ------------------------------ */
export function FinancialSummaryWidget({ balance, onSeeAll }: { balance: Balance; onSeeAll: () => void }) {
  const empty = balance.solicitado === 0 && balance.pago === 0;
  return (
    <div className="card widget">
      <div className="card-header">
        <h3><span aria-hidden="true">💳</span> Status financeiro</h3>
        {!empty && <button className="widget-link" onClick={onSeeAll}>Ver detalhes →</button>}
      </div>
      <div className="card-body">
        {empty ? (
          <EmptyState icon="💳" title="Não há cobranças no momento" text="Quando houver itens aprovados, o resumo financeiro aparece aqui." />
        ) : (
          <div className="finance-grid">
            <div>
              <span>Total solicitado</span>
              <strong className="money">{fmtMoney(balance.solicitado)}</strong>
            </div>
            <div>
              <span>Total aprovado</span>
              <strong className="money positive">{fmtMoney(balance.aprovado)}</strong>
            </div>
            <div>
              <span>Saldo pendente</span>
              <strong className="money pending">{fmtMoney(balance.saldoPendente)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Prazos -------------------------------- */
export function DeadlinesWidget({ deadlines, onSeeAll }: { deadlines: Deadline[]; onSeeAll: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...deadlines].sort((a, b) => (a.dataLimite ?? '').localeCompare(b.dataLimite ?? '')).slice(0, 4);

  return (
    <div className="card widget">
      <div className="card-header">
        <h3><span aria-hidden="true">⏰</span> Próximos prazos</h3>
        {deadlines.length > 0 && <button className="widget-link" onClick={onSeeAll}>Ver todos →</button>}
      </div>
      <div className="card-body">
        {sorted.length === 0 ? (
          <EmptyState icon="⏰" title="Nenhum prazo pendente" text="A produção ainda não cadastrou prazos para este evento." />
        ) : (
          <ul className="deadline-list">
            {sorted.map((d) => {
              const overdue = Boolean(d.dataLimite && d.dataLimite < today);
              const date = d.dataLimite ? new Date(`${d.dataLimite}T12:00:00`) : null;
              return (
                <li key={d.id} className={overdue ? 'overdue' : ''}>
                  <span className="deadline-date">
                    {date ? `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}` : '—'}
                  </span>
                  <span className="deadline-title">{d.titulo}</span>
                  {overdue && <Badge label="Vencido" tone="danger" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Acesso rápido ---------------------------- */
export function QuickAccess({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const links = [
    { tab: 'updates', icon: '📣', label: 'Updates do evento' },
    { tab: 'documentos', icon: '📄', label: 'Meus documentos' },
    { tab: 'extras', icon: '📦', label: 'Itens extras' },
    { tab: 'equipe', icon: '👥', label: 'Minha equipe' },
    { tab: 'financeiro', icon: '💳', label: 'Financeiro' },
    { tab: 'prazos', icon: '⏰', label: 'Prazos' },
    { tab: 'manual', icon: '📘', label: 'Manual do expositor' },
    { tab: 'discussoes', icon: '💬', label: 'Discussões' },
  ];
  return (
    <section>
      <h3 className="section-title">Acesso rápido</h3>
      <div className="quick-grid">
        {links.map((l) => (
          <button key={l.tab} className="quick-card" onClick={() => onNavigate(l.tab)}>
            <span className="quick-icon" aria-hidden="true">{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Suporte -------------------------------- */
export function SupportWidget({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="card widget support-widget">
      <div className="card-body flex items-center justify-between gap-12">
        <div className="flex items-center gap-12">
          <span className="widget-icon" aria-hidden="true">🎧</span>
          <div>
            <div className="widget-value" style={{ fontSize: 15 }}>Precisa de ajuda?</div>
            <div className="text-sm text-muted">Fale com o nosso time</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpen}>Abrir solicitação</button>
      </div>
    </div>
  );
}
