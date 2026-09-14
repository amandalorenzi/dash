'use client';

import {
  StandSummaryCard, RegistrationStatusCard, DashValidationCard, EventCountdownCard,
  EventUpdatesWidget, ExtrasSummaryWidget, TeamSummaryWidget, FinancialSummaryWidget,
  DeadlinesWidget, QuickAccess, SupportWidget,
} from '@/components/portal/widgets';
import type { calculateSupplierBalance } from '@/modules/orders/calculations';
import type { Supplier, SupplierOrder, TeamMember, Deadline, EventUpdate, FirestoreEvent } from '@/types/domain';

/**
 * Visão geral do expositor: um painel de resumos com atalhos, não a
 * implementação completa de cada área. Cada widget aponta para a aba
 * correspondente via `onNavigate`.
 */
export function ExhibitorDashboard({
  supplier, event, updates, orders, team, deadlines, balance, onNavigate,
}: {
  supplier: Supplier;
  event: FirestoreEvent | null;
  updates: EventUpdate[];
  orders: SupplierOrder[];
  team: TeamMember[];
  deadlines: Deadline[];
  balance: ReturnType<typeof calculateSupplierBalance>;
  onNavigate: (tab: string) => void;
}) {
  return (
    <div className="dash-grid">
      <div className="dash-main">
        <div className="status-row">
          <StandSummaryCard supplier={supplier} floorPlanUrl={event?.floorPlanUrl} />
          <RegistrationStatusCard supplier={supplier} />
          <DashValidationCard supplier={supplier} />
        </div>

        <div className="dash-two-col">
          <EventUpdatesWidget updates={updates} onSeeAll={() => onNavigate('updates')} />
          <div className="flex-col gap-16">
            <ExtrasSummaryWidget orders={orders} onSeeAll={() => onNavigate('extras')} />
            <TeamSummaryWidget team={team} onSeeAll={() => onNavigate('equipe')} />
          </div>
        </div>

        <QuickAccess onNavigate={onNavigate} />
      </div>

      <aside className="dash-side">
        <EventCountdownCard event={event} />
        <FinancialSummaryWidget balance={balance} onSeeAll={() => onNavigate('financeiro')} />
        <DeadlinesWidget deadlines={deadlines} onSeeAll={() => onNavigate('prazos')} />
        <SupportWidget onOpen={() => onNavigate('discussoes')} />
      </aside>
    </div>
  );
}
