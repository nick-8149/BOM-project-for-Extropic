interface LifecycleBadgeProps {
  status: string;
}

export default function LifecycleBadge({ status }: LifecycleBadgeProps) {
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-400 border border-slate-700'; // Default Gray
  
  if (normalized === 'ACTIVE') {
    styles = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'; // Green
  } else if (normalized === 'NRND') {
    styles = 'bg-amber-500/10 text-amber-400 border border-amber-500/20'; // Amber/Yellow
  } else if (normalized === 'DEPRECATED') {
    styles = 'bg-orange-500/10 text-orange-400 border border-orange-500/20'; // Orange
  } else if (normalized === 'OBSOLETE') {
    styles = 'bg-red-500/10 text-red-400 border border-red-500/20'; // Red
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${styles}`}>
      {status}
    </span>
  );
}
