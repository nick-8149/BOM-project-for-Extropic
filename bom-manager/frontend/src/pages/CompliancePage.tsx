import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, AlertTriangle, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import RoHSBadge from '../components/RoHSBadge';

interface Part {
  id: string;
  part_number: string;
  category: string;
  compliance_info?: {
    rohs_status: string;
    rohs_directive_ref: string | null;
    certificate_link: string | null;
  } | null;
}

export default function CompliancePage() {
  const { token } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Part[]>('/api/v1/parts', { token })
      .then(setParts)
      .catch((e) => console.error("Compliance load error:", e))
      .finally(() => setLoading(false));
  }, [token]);

  const compliantCount = parts.filter((p) => p.compliance_info?.rohs_status?.toUpperCase() === 'COMPLIANT').length;
  const nonCompliantCount = parts.filter((p) => p.compliance_info?.rohs_status?.toUpperCase() === 'NON-COMPLIANT').length;
  const unknownCount = parts.filter((p) => !p.compliance_info || p.compliance_info.rohs_status?.toUpperCase() === 'UNKNOWN').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-500 glow-blue rounded" />
          RoHS Compliance Audit
        </h1>
        <p className="text-slate-400 text-sm font-medium">Monitor green compliance directives status and download certificate documents.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RoHS Compliant */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 glow-emerald">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{compliantCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RoHS Compliant</div>
          </div>
        </div>

        {/* Non-Compliant Items */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 glow-red pulse-highlight">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{nonCompliantCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Non-Compliant Items</div>
          </div>
        </div>

        {/* Unknown Status */}
        <div className="glass-panel glass-panel-hover rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-slate-500/10 text-slate-400 rounded-xl border border-slate-800/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">{unknownCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unknown Status</div>
          </div>
        </div>
      </div>

      {/* Compliance List Table */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
          <FileText className="w-5 h-5 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Component Green Declarations ({parts.length})
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="h-10 w-full shimmer-bg rounded" />
            <div className="h-10 w-full shimmer-bg rounded" />
            <div className="h-10 w-full shimmer-bg rounded" />
          </div>
        ) : parts.length === 0 ? (
          <div className="text-slate-500 text-xs italic text-center py-12">No components registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="pb-3 pl-3">Part Number</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">RoHS Status</th>
                  <th className="pb-3">Directive Ref</th>
                  <th className="pb-3 pr-3 text-right">Certificate Doc Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                {parts.map((p) => (
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
                      <RoHSBadge status={p.compliance_info?.rohs_status || 'Unknown'} />
                    </td>
                    <td className="py-3.5 text-slate-400 font-semibold">
                      {p.compliance_info?.rohs_directive_ref || '—'}
                    </td>
                    <td className="py-3.5 pr-3 text-right">
                      {p.compliance_info?.certificate_link ? (
                        <a
                          href={p.compliance_info.certificate_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Certificate (PDF)
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
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
