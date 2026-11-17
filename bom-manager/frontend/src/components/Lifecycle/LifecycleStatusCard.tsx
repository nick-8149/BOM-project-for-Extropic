import { useState, useEffect } from 'react';
import { fetchLifecycleForPart } from '../../api/identityClient';
import type { LifecycleLookupResponse } from '../../api/identityClient';
import { useAuth } from '../../context/AuthContext';
import { Activity, ShieldOff, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface Props {
  internalPartNumber: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'text-emerald-400',
  NRND: 'text-amber-400',
  EOL: 'text-orange-400',
  OBSOLETE: 'text-red-400',
  DEPRECATED: 'text-red-400',
  UNKNOWN: 'text-slate-400',
};

const lookupStatusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  SUCCESS: { color: 'text-emerald-400', icon: CheckCircle, label: 'SUCCESS' },
  BLOCKED: { color: 'text-amber-400', icon: ShieldOff, label: 'BLOCKED' },
  FAILED: { color: 'text-red-400', icon: XCircle, label: 'FAILED' },
  NOT_REQUESTED: { color: 'text-slate-500', icon: HelpCircle, label: 'NOT REQUESTED' },
  PENDING: { color: 'text-blue-400', icon: Clock, label: 'PENDING' },
};

export default function LifecycleStatusCard({ internalPartNumber }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LifecycleLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !internalPartNumber) return;
    setLoading(true);
    fetchLifecycleForPart(token, internalPartNumber)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load lifecycle data'))
      .finally(() => setLoading(false));
  }, [token, internalPartNumber]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-24 bg-slate-800 rounded mb-3" />
        <div className="h-6 w-32 bg-slate-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Lifecycle</span>
        </div>
        <div className="text-sm text-slate-500">No lifecycle data available.</div>
      </div>
    );
  }

  if (!data) return null;

  const lookupCfg = lookupStatusConfig[data.lookup_status] || lookupStatusConfig.NOT_REQUESTED;
  const LookupIcon = lookupCfg.icon;

  // BLOCKED or FAILED — show reason
  if (data.lookup_status === 'BLOCKED' || data.lookup_status === 'FAILED') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Lifecycle</span>
        </div>
        <div className="flex items-center gap-2">
          <LookupIcon className={`w-5 h-5 ${lookupCfg.color}`} />
          <span className={`text-sm font-bold ${lookupCfg.color}`}>{lookupCfg.label}</span>
        </div>
        {data.reason && (
          <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
            {data.reason}
          </p>
        )}
      </div>
    );
  }

  // SUCCESS — show lifecycle details
  if (data.lookup_status === 'SUCCESS' && data.lifecycle) {
    const lc = data.lifecycle;
    const statusColor = statusColors[lc.lifecycle_status?.toUpperCase() || 'UNKNOWN'] || 'text-slate-400';

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Lifecycle</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">
            {data.source || '—'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Status</div>
            <div className={`text-sm font-bold ${statusColor}`}>
              {lc.lifecycle_status || 'UNKNOWN'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Availability</div>
            <div className="text-sm font-semibold text-slate-200">
              {lc.availability_status || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Obsolete</div>
            <div className="text-sm text-slate-300">
              {lc.is_obsolete === null ? '—' : lc.is_obsolete ? 'YES' : 'NO'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Discontinued</div>
            <div className="text-sm text-slate-300">
              {lc.is_discontinued === null ? '—' : lc.is_discontinued ? 'YES' : 'NO'}
            </div>
          </div>
        </div>

        {data.retrieved_at && (
          <div className="text-[10px] text-slate-600 flex items-center gap-1 pt-1 border-t border-slate-800">
            <Clock className="w-3 h-3" />
            Last updated: {new Date(data.retrieved_at).toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  // NOT_REQUESTED or other
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Activity className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Lifecycle</span>
      </div>
      <div className="flex items-center gap-2">
        <LookupIcon className={`w-5 h-5 ${lookupCfg.color}`} />
        <span className={`text-sm font-semibold ${lookupCfg.color}`}>{lookupCfg.label}</span>
      </div>
    </div>
  );
}
