import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertTriangle, ShieldAlert } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Lifecycle & EOL Forecast</h1>
        <p className="text-slate-400 text-sm">Monitor component aging, upcoming obsolescence dates, and critical EOL alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'OBSOLETE').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Obsolete Parts</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'NRND').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">NRND Components</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => {
                const y = p.lifecycle_info?.years_to_eol;
                return y !== undefined && y !== null && y > 0 && y <= 2.0;
              }).length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">EOL Near (Within 2 Yrs)</div>
          </div>
        </div>
      </div>

      {/* EOL Concerns list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
          Obsolete & Impending EOL Warning Items
        </h3>
        {loading ? (
          <div className="text-slate-500 text-xs">Scanning lifecycle logs...</div>
        ) : eolParts.length === 0 ? (
          <div className="text-slate-500 text-xs italic">All active catalog parts have stable lifecycle parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="pb-3">Part Number</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Lifecycle Status</th>
                  <th className="pb-3">Est. Years to EOL</th>
                  <th className="pb-3">Forecast EOL Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {eolParts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">
                      <Link to={`/parts/${p.id}`} className="text-blue-400 hover:underline">
                        {p.part_number}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-400">{p.category || '—'}</td>
                    <td className="py-3">
                      <LifecycleBadge status={p.lifecycle_info?.lifecycle_status || 'Unknown'} />
                    </td>
                    <td className="py-3 font-semibold">
                      {p.lifecycle_info?.years_to_eol !== null && p.lifecycle_info?.years_to_eol !== undefined ? (
                        <span className={p.lifecycle_info.years_to_eol <= 2.0 ? 'text-red-400' : 'text-slate-300'}>
                          {p.lifecycle_info.years_to_eol} Yrs
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-slate-400">
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
