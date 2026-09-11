import { toneFor } from '@/config/labels';

export function Badge({ label, tone }: { label: string; tone?: string }) {
  return <span className={`badge badge-${tone ?? 'neutral'}`}>{label}</span>;
}

export function StatusBadge({ value, labelMap }: { value: string; labelMap: Record<string, string> }) {
  return <Badge label={labelMap[value] ?? value} tone={toneFor(value)} />;
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="ic">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
