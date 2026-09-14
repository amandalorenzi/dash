'use client';

/* eslint-disable @next/next/no-img-element */

import type { FirestoreEvent } from '@/types/domain';

function formatEventPeriod(event: FirestoreEvent | null): string {
  if (!event?.dataInicio) return '';
  const start = new Date(`${event.dataInicio}T12:00:00`);
  const end = event.dataFim ? new Date(`${event.dataFim}T12:00:00`) : null;
  const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

  if (!end || event.dataInicio === event.dataFim) {
    return `${start.getDate()} de ${monthYear.format(start)}`;
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${start.getDate()} a ${end.getDate()} de ${monthYear.format(end)}`
    : `${start.getDate()} de ${monthYear.format(start)} a ${end.getDate()} de ${monthYear.format(end)}`;
}

export function EventHero({ event }: { event: FirestoreEvent | null }) {
  const period = formatEventPeriod(event);
  const cidadeUf = [event?.endereco?.cidade, event?.endereco?.estado].filter(Boolean).join(' - ');

  return (
    <div className="event-hero">
      {event?.bannerUrl && <img className="event-hero-bg" src={event.bannerUrl} alt="" aria-hidden="true" />}
      <div className="event-hero-inner">
        <div className="event-hero-identity">
          {event?.logoUrl
            ? <img className="event-hero-logo" src={event.logoUrl} alt={event?.name ?? 'Logo do evento'} />
            : <h1 className="event-hero-title">{event?.name ?? 'Evento'}</h1>}
          {event?.tagline && <p className="event-hero-tagline">{event.tagline}</p>}
        </div>

        <div className="event-hero-meta">
          {period && (
            <div className="event-hero-meta-item">
              <span className="ic" aria-hidden="true">🗓</span>
              <div>
                <strong>{period}</strong>
                {event?.horario && <span>{event.horario}</span>}
              </div>
            </div>
          )}
          {(event?.local || cidadeUf) && (
            <div className="event-hero-meta-item">
              <span className="ic" aria-hidden="true">📍</span>
              <div>
                <strong>{event?.local || cidadeUf}</strong>
                {event?.local && cidadeUf && <span>{cidadeUf}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
