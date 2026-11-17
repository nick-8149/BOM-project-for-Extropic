import type { IdentityResolutionRecord } from '../../api/identityClient';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  record: IdentityResolutionRecord;
}

export default function LifecycleLookupStatus({ record }: Props) {
  if (record.lifecycle_lookup_allowed) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-400">
        <ShieldCheck className="w-8 h-8 mb-2" />
        <span className="text-sm font-semibold uppercase tracking-wide">Lifecycle Lookup Allowed</span>
        <span className="text-xs text-emerald-500/80 text-center mt-1">Identity verified and resolved.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400">
      <ShieldAlert className="w-8 h-8 mb-2" />
      <span className="text-sm font-semibold uppercase tracking-wide">Lifecycle Lookup Blocked</span>
      <span className="text-xs text-rose-500/80 text-center mt-1 max-w-[200px]">
        {record.lifecycle_block_reason || "Identity not resolved."}
      </span>
    </div>
  );
}
