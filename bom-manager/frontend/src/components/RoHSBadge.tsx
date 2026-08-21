interface RoHSBadgeProps {
  status: string;
}

export default function RoHSBadge({ status }: RoHSBadgeProps) {
  const normalized = status.toLowerCase();

  let styles = 'bg-slate-800 text-slate-400 border border-slate-700';
  let label = 'RoHS Unknown';

  if (normalized.includes('compliant') && !normalized.includes('non')) {
    styles = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    label = 'RoHS Compliant';
  } else if (normalized.includes('non')) {
    styles = 'bg-red-500/10 text-red-400 border border-red-500/20';
    label = 'RoHS Non-Compliant';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wider ${styles}`}>
      {label}
    </span>
  );
}
