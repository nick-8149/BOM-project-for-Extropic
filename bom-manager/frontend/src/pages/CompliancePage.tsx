import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
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
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">RoHS Compliance Log</h1>
        <p className="text-slate-400 text-sm">Monitor green compliance directives status and download certificate documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => p.compliance_info?.rohs_status?.toUpperCase() === 'COMPLIANT').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">RoHS Compliant</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => p.compliance_info?.rohs_status?.toUpperCase() === 'NON-COMPLIANT').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Non-Compliant Items</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-slate-500/10 text-slate-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {parts.filter((p) => !p.compliance_info || p.compliance_info.rohs_status?.toUpperCase() === 'UNKNOWN').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Unknown Status</div>
          </div>
        </div>
      </div>

      {/* Compliance List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
          Component Green Declarations
        </h3>
        {loading ? (
          <div className="text-slate-500 text-xs">Scanning compliance catalog...</div>
        ) : parts.length === 0 ? (
          <div className="text-slate-500 text-xs italic">No parts registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="pb-3">Part Number</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">RoHS Status</th>
                  <th className="pb-3">Directive Ref</th>
                  <th className="pb-3">Certificate Doc Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {parts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">
                      <Link to={`/parts/${p.id}`} className="text-blue-400 hover:underline">
                        {p.part_number}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-400">{p.category || '—'}</td>
                    <td className="py-3">
                      <RoHSBadge status={p.compliance_info?.rohs_status || 'Unknown'} />
                    </td>
                    <td className="py-3 text-slate-400">
                      {p.compliance_info?.rohs_directive_ref || '—'}
                    </td>
                    <td className="py-3">
                      {p.compliance_info?.certificate_link ? (
                        <a
                          href={p.compliance_info.certificate_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Download Certificate (PDF)
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
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
