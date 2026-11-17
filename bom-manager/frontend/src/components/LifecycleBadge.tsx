interface LifecycleBadgeProps {
  status?: string | null;
  source?: string | null;
  lookup_status?: string | null;
}

export default function LifecycleBadge({ status, source, lookup_status }: LifecycleBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();

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

  const isUnavailable = !normalized || 
    ['NOT AVAILABLE', 'UNKNOWN', 'UNAVAILABLE', 'UNRESOLVED', 'NULL'].includes(normalized) || 
    lookup_status === 'NOT_AVAILABLE';

  if (isUnavailable) {
    styles = 'bg-slate-800 text-slate-400 border border-slate-700'; // Gray
  }

  const displayStatus = isUnavailable 
    ? (lookup_status === 'NOT_AVAILABLE' ? 'NOT AVAILABLE' : 'UNAVAILABLE') 
    : status;

  return (
    <div className="inline-flex flex-col gap-1 items-start">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${styles}`}>
        {displayStatus}
      </span>
      {source && (
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider ml-1">
          {source === 'nexar' ? 'Real Nexar' : source === 'unresolved' ? 'Unresolved' : source === 'mock' ? 'Demo/Mock' : source}
        </span>
      )}
    </div>
  );
}
