import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { LayoutDashboard, FileText, Cpu, AlertTriangle, ShieldCheck, TrendingUp, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Part {
  id: string;
  part_number: string;
  category: string;
  lifecycle_info?: {
    lifecycle_status: string;
    years_to_eol: number | null;
  } | null;
  compliance_info?: {
    rohs_status: string;
  } | null;
}

interface BOM {
  id: string;
  name: string;
  total_items: number;
  matched_items: number;
  unmatched_items: number;
  review_items: number;
  uploaded_at: string;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<Part[]>('/api/v1/parts', { token }),
      apiRequest<BOM[]>('/api/v1/bom', { token })
    ])
      .then(([partsData, bomsData]) => {
        setParts(partsData);
        setBoms(bomsData);
      })
      .catch((e) => console.error("Dashboard data load error:", e))
      .finally(() => setLoading(false));
  }, [token]);

  // Aggregate metrics
  const totalBOMs = boms.length;
  const totalPartsInCatalog = parts.length;
  
  const obsoleteCount = parts.filter(p => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'OBSOLETE').length;
  const compliantCount = parts.filter(p => p.compliance_info?.rohs_status?.toUpperCase() === 'COMPLIANT').length;

  // Chart 1: Lifecycle Distribution
  const activeCount = parts.filter(p => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'ACTIVE').length;
  const nrndCount = parts.filter(p => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'NRND').length;
  const deprecatedCount = parts.filter(p => p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'DEPRECATED').length;
  
  const lifecycleData = [
    { name: 'Active', value: activeCount, fill: '#10b981' },
    { name: 'NRND', value: nrndCount, fill: '#f59e0b' },
    { name: 'Deprecated', value: deprecatedCount, fill: '#f97316' },
    { name: 'Obsolete', value: obsoleteCount, fill: '#ef4444' }
  ].filter(d => d.value > 0);

  // Chart 2: Match Distribution across BOMs
  const matchedSum = boms.reduce((acc, b) => acc + b.matched_items, 0);
  const unmatchedSum = boms.reduce((acc, b) => acc + b.unmatched_items, 0);
  const reviewSum = boms.reduce((acc, b) => acc + b.review_items, 0);

  const matchData = [
    { name: 'Matched', value: matchedSum, fill: '#10b981' },
    { name: 'Unmatched', value: unmatchedSum, fill: '#ef4444' },
    { name: 'Review Needed', value: reviewSum, fill: '#f59e0b' }
  ].filter(d => d.value > 0);

  const rohsPercent = totalPartsInCatalog > 0 ? Math.round((compliantCount / totalPartsInCatalog) * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with gradient line */}
      <div className="relative pb-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-500 glow-blue rounded" />
            Hardware & Lifecycle Dashboard
          </h1>
          <p className="text-slate-400 text-sm font-medium">Real-time health monitoring of component catalogs and Bill of Materials matching parameters.</p>
        </div>
        <Link 
          to="/upload" 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 px-5 rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transform hover:-translate-y-0.5 text-center"
        >
          Ingest New BOM
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Scanned BOMs */}
        <div className="glass-panel rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 glow-blue shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            {loading ? (
              <div className="h-8 w-16 bg-slate-800 rounded shimmer-bg" />
            ) : (
              <div className="text-3xl font-black text-white tracking-tight">{totalBOMs}</div>
            )}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scanned BOMs</div>
          </div>
        </div>

        {/* Catalog Components */}
        <div className="glass-panel rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 glow-emerald shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            {loading ? (
              <div className="h-8 w-16 bg-slate-800 rounded shimmer-bg" />
            ) : (
              <div className="text-3xl font-black text-white tracking-tight">{totalPartsInCatalog}</div>
            )}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Catalog Components</div>
          </div>
        </div>

        {/* Obsolete Items */}
        <div className="glass-panel rounded-xl p-5 flex items-center gap-4">
          <div className={`p-3.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 glow-red shrink-0 ${obsoleteCount > 0 && !loading ? 'pulse-highlight' : ''}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            {loading ? (
              <div className="h-8 w-16 bg-slate-800 rounded shimmer-bg" />
            ) : (
              <div className="text-3xl font-black text-white tracking-tight">{obsoleteCount}</div>
            )}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Obsolete Warnings</div>
          </div>
        </div>

        {/* RoHS Compliance */}
        <div className="glass-panel rounded-xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20 glow-teal shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            {loading ? (
              <div className="h-8 w-16 bg-slate-800 rounded shimmer-bg" />
            ) : (
              <div className="text-3xl font-black text-white tracking-tight">{rohsPercent}%</div>
            )}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RoHS Compliant</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-xl p-6 h-80 shimmer-bg" />
          <div className="glass-panel rounded-xl p-6 h-80 shimmer-bg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Matching Rate distribution */}
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between lg:col-span-5 min-h-[360px]">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                BOM Pipeline Matching Rates
              </h3>
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </div>
            {matchData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <HelpCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 italic">Upload and parse a BOM file to load rate metrics.</p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={matchData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {matchData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Lifecycle Distributions */}
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between lg:col-span-7 min-h-[360px]">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Catalog Component Status Distribution
              </h3>
              <Cpu className="w-4 h-4 text-slate-500" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {lifecycleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent BOM uploads list */}
          <div className="glass-panel rounded-xl p-6 lg:col-span-12">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-3 mb-4">
              Recent BOM Uploads
            </h3>
            {boms.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No BOMs uploaded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="pb-3 pl-4">BOM Name</th>
                      <th className="pb-3">Total Components</th>
                      <th className="pb-3">Match Accuracy</th>
                      <th className="pb-3">Action Required</th>
                      <th className="pb-3 pr-4 text-right">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                    {boms.slice(0, 5).map((b) => {
                      const matchPercent = b.total_items > 0 ? Math.round((b.matched_items / b.total_items) * 100) : 0;
                      return (
                        <tr key={b.id} className="hover:bg-slate-800/25 transition-colors duration-150">
                          <td className="py-3.5 pl-4 font-semibold text-slate-200">
                            <Link to={`/bom/${b.id}`} className="hover:text-blue-400 hover:underline">
                              {b.name}
                            </Link>
                          </td>
                          <td className="py-3.5 font-medium">{b.total_items} items</td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${matchPercent}%` }} />
                              </div>
                              <span className="font-bold text-[10px]">{matchPercent}%</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            {b.review_items > 0 ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {b.review_items} needs review
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Complete
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-slate-500 font-medium">
                            {new Date(b.uploaded_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
