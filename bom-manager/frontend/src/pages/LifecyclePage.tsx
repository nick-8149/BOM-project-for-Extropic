import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertTriangle, ShieldAlert, Cpu, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import LifecycleBadge from '../components/LifecycleBadge';

interface Part {
  id: string;
  part_number: string;
  category: string;
  lifecycle_info?: {
    lifecycle_status: string;
    eol_date: string | null;
    years_to_eol: number | null;
  } | null;
}

export default function LifecyclePage() {
  const { token } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Part[]>('/api/v1/parts', { token })
      .then(setParts)
      .catch((e) => console.error("Lifecycle load error:", e))
      .finally(() => setLoading(false));
  }, [token]);

  // Filter parts with EOL concerns (Obsolete, NRND, Deprecated, or years to EOL < 2)
  const eolParts = parts.filter((p) => {
    const status = p.lifecycle_info?.lifecycle_status?.toUpperCase() || '';
    const years = p.lifecycle_info?.years_to_eol;
    return (
      ['OBSOLETE', 'NRND', 'DEPRECATED'].includes(status) ||
      (years !== undefined && years !== null && years <= 2.0)
    );
  });

  const obsoleteCount = parts.filter((p) => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'OBSOLETE').length;
  const nrndCount = parts.filter((p) => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'NRND').length;
  const nearEolCount = parts.filter((p) => {
    const y = p.lifecycle_info?.years_to_eol;
    return y !== undefined && y !== null && y > 0 && y <= 2.0;
  }).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-blue-500 glow-blue rounded" />
          Lifecycle & EOL Forecast
        </h1>
        <p className="text-slate-400 text-sm font-medium">Monitor component aging, upcoming obsolescence dates, and critical EOL alerts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Obsolete Parts */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 glow-red pulse-highlight">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{obsoleteCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Obsolete Parts</div>
          </div>
        </div>

        {/* NRND Components */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 glow-amber">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{nrndCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NRND Components</div>
          </div>
        </div>

        {/* Near EOL */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 glow-blue">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{nearEolCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">EOL Near (≤ 2 Yrs)</div>
          </div>
        </div>
      </div>

      {/* Main warning table */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
          <Layers className="w-5 h-5 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Obsolete & Impending EOL Warning Items ({eolParts.length})
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="h-10 w-full shimmer-bg rounded" />
            <div className="h-10 w-full shimmer-bg rounded" />
            <div className="h-10 w-full shimmer-bg rounded" />
          </div>
        ) : eolParts.length === 0 ? (
          <div className="text-slate-500 text-xs italic text-center py-12">
            All active catalog components have stable lifecycle parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="pb-3 pl-3">Part Number</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Lifecycle Status</th>
                  <th className="pb-3">Est. Years to EOL</th>
                  <th className="pb-3 pr-3 text-right">Forecast EOL Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                {eolParts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-850/30 transition-colors duration-150">
                    <td className="py-3.5 pl-3 font-mono font-bold text-slate-200">
                      <Link to={`/parts/${p.id}`} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                        {p.part_number}
                      </Link>
                    </td>
                    <td className="py-3.5 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-slate-600" />
                        {p.category || 'Component'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <LifecycleBadge status={p.lifecycle_info?.lifecycle_status || 'Unknown'} />
                    </td>
                    <td className="py-3.5">
                      {p.lifecycle_info?.years_to_eol !== null && p.lifecycle_info?.years_to_eol !== undefined ? (
                        <span className={`font-semibold ${p.lifecycle_info.years_to_eol <= 2.0 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                          {p.lifecycle_info.years_to_eol} Yrs
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-3 text-right text-slate-400 font-medium">
                      {p.lifecycle_info?.eol_date ? new Date(p.lifecycle_info.eol_date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
