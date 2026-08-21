import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { LayoutDashboard, FileText, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';

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



  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-500" />
          Hardware & Lifecycle Dashboard
        </h1>
        <p className="text-slate-400 text-sm">Real-time health monitoring of component catalogs and Bill of Materials matching parameters.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{totalBOMs}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Scanned BOMs</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{totalPartsInCatalog}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Catalog Components</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{obsoleteCount}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Obsolete Items</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {totalPartsInCatalog > 0 ? round((compliantCount / totalPartsInCatalog) * 100, 1) : 0}%
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">RoHS Compliant</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-xs">Assembling layout graphics...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Matching Rate distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              BOM Pipeline Matching Rates
            </h3>
            {matchData.length === 0 ? (
              <div className="text-slate-500 text-xs italic py-10 text-center">Upload and parse a BOM file to load rate metrics.</div>
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
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Lifecycle Distributions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              Catalog Component Status Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {lifecycleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function round(value: number, precision: number) {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}
