import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip 
} from 'recharts';
import { 
  LayoutDashboard, RefreshCw, FileText, Cpu, AlertTriangle, ShieldCheck, 
  Layers, Search, FileSpreadsheet, Truck, BellRing, Settings, 
  ArrowRight, ShieldAlert, CheckCircle, Info, ExternalLink, HelpCircle, UploadCloud
} from 'lucide-react';

interface SummaryData {
  total_components: number;
  matched_components: number;
  high_risk_components: number;
  obsolete_components: number;
  compliance_issues: number;
  total_boms: number;
}

interface ComponentRequiringAttention {
  id: string;
  part_number: string;
  issue: string;
  risk_score: number;
  priority: string;
  lifecycle: string;
  bom_id: string;
  bom_name: string;
}

interface EOLTimelineItem {
  part_number: string;
  eol_date: string;
  years_remaining: number;
  risk: string;
}

interface RecentBOM {
  id: string;
  name: string;
  uploaded_at: string;
  total_items: number;
  match_rate: number;
  risk_score: number;
  status: string;
}

interface SupplierRiskData {
  multi_source: number;
  limited_source: number;
  single_source: number;
  single_source_parts: Array<{
    id: string;
    part_number: string;
    supplier_name: string;
    supplier_part_number: string;
  }>;
}

interface ReplacementOpportunity {
  original_part_number: string;
  original_lifecycle: string;
  replacement_part_number: string;
  confidence_score: number;
  review_status: string;
}

interface AlertItem {
  id: string;
  severity: string;
  title: string;
  timestamp: string;
  description: string;
}

interface DashboardOverview {
  summary: SummaryData;
  lifecycle_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
  components_requiring_attention: ComponentRequiringAttention[];
  compliance_overview: {
    compliant: number;
    non_compliant: number;
    unknown: number;
  };
  eol_timeline: EOLTimelineItem[];
  recent_boms: RecentBOM[];
  match_quality: {
    matched: number;
    review: number;
    unmatched: number;
  };
  supplier_risk: SupplierRiskData;
  replacement_opportunities: ReplacementOpportunity[];
  recent_alerts: AlertItem[];
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await apiRequest<DashboardOverview>('/api/v1/dashboard/overview', { token });
      setData(overview);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve dashboard aggregation.');
      showToast('Could not load dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-900 border border-slate-850 rounded-lg shimmer-bg" />
            <div className="h-4 w-96 bg-slate-900 border border-slate-850 rounded-lg shimmer-bg" />
          </div>
          <div className="h-10 w-32 bg-slate-900 border border-slate-850 rounded-lg shimmer-bg" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-5 h-24 shimmer-bg" />
          ))}
        </div>

        {/* Charts & Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-xl p-6 h-96 shimmer-bg" />
          <div className="glass-panel rounded-xl p-6 h-96 shimmer-bg" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-bounce" />
        <h2 className="text-xl font-extrabold text-white">Dashboard Loading Error</h2>
        <p className="text-slate-400 text-xs max-w-md">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Fetching Data
        </button>
      </div>
    );
  }

  // Fallback defaults
  const summary = data?.summary || {
    total_components: 0,
    matched_components: 0,
    high_risk_components: 0,
    obsolete_components: 0,
    compliance_issues: 0,
    total_boms: 0
  };

  const lifecycleData = Object.entries(data?.lifecycle_distribution || {}).map(([name, value]) => {
    let fill = '#6b7280'; // grey
    if (name.toUpperCase() === 'ACTIVE') fill = '#10b981'; // status-active
    else if (name.toUpperCase() === 'NRND') fill = '#f59e0b'; // status-nrnd
    else if (name.toUpperCase() === 'OBSOLETE') fill = '#ef4444'; // status-obsolete
    else if (name.toUpperCase() === 'DEPRECATED') fill = '#f97316'; // status-deprecated
    return { name, value, fill };
  }).filter(d => d.value > 0);

  const riskData = Object.entries(data?.risk_distribution || {}).map(([name, value]) => {
    let fill = '#3b82f6'; // blue
    if (name.toUpperCase() === 'CRITICAL') fill = '#7f1d1d'; // deep red
    else if (name.toUpperCase() === 'HIGH') fill = '#ef4444'; // red
    else if (name.toUpperCase() === 'MEDIUM') fill = '#f59e0b'; // amber
    else if (name.toUpperCase() === 'LOW') fill = '#10b981'; // green
    return { name, value, fill };
  });

  const totalCatalogParts = summary.total_components;
  const matchRate = summary.total_components > 0 
    ? Math.round((summary.matched_components / summary.total_components) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn text-slate-200">
      {/* ── SECTION 1 — HEADER ── */}
      <div className="relative pb-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1">
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
            <span>BOM Overview Command Center</span>
            {lastUpdated && (
              <>
                <span className="text-slate-700">•</span>
                <span className="text-slate-400 font-medium lowercase">last fetched at {lastUpdated}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-none">
            BOM Intelligence Dashboard
          </h1>
          {user && (
            <p className="text-slate-400 text-xs font-semibold">
              Welcome back, <span className="text-blue-400">{user.username}</span> ({user.role}) — Monitoring operational EOL lifecycles.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-semibold"
            title="Reload metrics from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link 
            to="/upload" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            Ingest BOM
          </Link>
        </div>
      </div>

      {/* ── QUICK ACTIONS PANEL (SECTION 13) ── */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider pl-2 mr-2">Quick Access:</span>
        <button onClick={() => navigate('/upload')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
          <span>Upload BOM</span>
        </button>
        <button onClick={() => navigate('/search')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <Search className="w-3.5 h-3.5 text-blue-500" />
          <span>Search Part</span>
        </button>
        <button onClick={() => navigate('/reports')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
          <span>View Reports</span>
        </button>
        <button onClick={() => navigate('/lifecycle')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
          <span>View Lifecycle</span>
        </button>
        <button onClick={() => navigate('/compliance')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>View Compliance</span>
        </button>
        <button onClick={() => navigate('/replacements')} className="bg-slate-950/60 hover:bg-slate-850/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
          <Settings className="w-3.5 h-3.5 text-blue-500" />
          <span>View Replacements</span>
        </button>
      </div>

      {/* ── SECTION 2 — KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1: Total Components */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Components</span>
            <Cpu className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.total_components}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-1">Unique active part records</div>
          </div>
        </div>

        {/* KPI 2: Matched Components */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched Parts</span>
            <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.matched_components}</div>
            <div className="text-[9px] text-emerald-400 font-bold mt-1">
              {matchRate}% resolved match
            </div>
          </div>
        </div>

        {/* KPI 3: High Risk */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High Risk Items</span>
            <ShieldAlert className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.high_risk_components}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-1">Requires immediate attention</div>
          </div>
        </div>

        {/* KPI 4: Obsolete */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Obsolete parts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.obsolete_components}</div>
            <div className="text-[9px] text-red-400 font-bold mt-1">Immediate redesign review</div>
          </div>
        </div>

        {/* KPI 5: Compliance */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance issues</span>
            <ShieldCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.compliance_issues}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-1">RoHS directive violations</div>
          </div>
        </div>

        {/* KPI 6: BOMs Analyzed */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total BOMs</span>
            <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white leading-none">{summary.total_boms}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-1">Uploaded in pipeline</div>
          </div>
        </div>
      </div>

      {/* ── CHARTS: SECTION 3 & SECTION 4 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 3 — LIFECYCLE DISTRIBUTION */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Component Lifecycle Status
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">Click category to filter list</span>
          </div>
          
          {lifecycleData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <HelpCircle className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 italic">No lifecycle details seeded in the database.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lifecycleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.name) {
                          navigate(`/lifecycle?status=${data.name}`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {lifecycleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#030712', border: '1px solid #1f2937', borderRadius: '8px' }} 
                      itemStyle={{ color: '#fff', fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold">
                {lifecycleData.map((item) => {
                  const pct = Math.round((item.value / totalCatalogParts) * 100) || 0;
                  return (
                    <div 
                      key={item.name} 
                      onClick={() => navigate('/lifecycle')}
                      className="flex items-center justify-between p-2 rounded bg-slate-950/45 border border-slate-900 hover:border-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-slate-400">{item.name}</span>
                      </div>
                      <span className="text-white">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4 — RISK DISTRIBUTION */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-7 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Risk Distribution
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">Active BOM items risk count</span>
          </div>

          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#030712', border: '1px solid #1f2937', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '10px' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  onClick={() => {
                    navigate('/lifecycle');
                  }}
                  className="cursor-pointer"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── SECTION 5 — COMPONENTS REQUIRING ATTENTION ── */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Components Requiring Engineering Attention
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Highest risk components in active BOMs</span>
        </div>

        {!data?.components_requiring_attention || data.components_requiring_attention.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-6">No critical/high component alerts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="pb-3 pl-4">Part Number</th>
                  <th className="pb-3">Source BOM</th>
                  <th className="pb-3">Flagged Issue</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Lifecycle</th>
                  <th className="pb-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {data.components_requiring_attention.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors duration-150">
                    <td className="py-3 pl-4 font-bold text-white tracking-wide">{item.part_number}</td>
                    <td className="py-3 font-semibold text-slate-400 text-[11px]">{item.bom_name}</td>
                    <td className="py-3 text-slate-300 font-medium">{item.issue}</td>
                    <td className="py-3 font-bold text-slate-100">{item.risk_score} / 100</td>
                    <td className="py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        item.priority === 'Critical' 
                          ? 'bg-red-950/80 border-red-500/30 text-red-400' 
                          : item.priority === 'High' 
                          ? 'bg-orange-950/80 border-orange-500/30 text-orange-400'
                          : 'bg-amber-950/80 border-amber-500/30 text-amber-400'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold ${
                        item.lifecycle.toUpperCase() === 'OBSOLETE' 
                          ? 'text-red-400' 
                          : item.lifecycle.toUpperCase() === 'NRND' 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                      }`}>
                        {item.lifecycle}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right space-x-2">
                      <Link 
                        to={`/bom/${item.bom_id}`}
                        className="text-blue-500 hover:text-blue-400 transition-colors font-bold text-[10px]"
                      >
                        Review
                      </Link>
                      <span className="text-slate-800">|</span>
                      <Link 
                        to="/replacements"
                        className="text-slate-400 hover:text-slate-200 transition-colors font-bold text-[10px]"
                      >
                        Alternative
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 6 — COMPLIANCE & SECTION 9 — MATCH QUALITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Visualization */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Compliance Overview
              </h3>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>

            <div className="space-y-4 my-6">
              {/* RoHS Compliant Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>RoHS Compliant</span>
                  <span>{data?.compliance_overview.compliant} Parts ({Math.round((data?.compliance_overview.compliant || 0) / (totalCatalogParts || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.compliance_overview.compliant || 0) / (totalCatalogParts || 1) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* RoHS Non-Compliant Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span className="text-red-400">Non-Compliant (Violations)</span>
                  <span className="text-red-400">{data?.compliance_overview.non_compliant} Parts ({Math.round((data?.compliance_overview.non_compliant || 0) / (totalCatalogParts || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.compliance_overview.non_compliant || 0) / (totalCatalogParts || 1) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* RoHS Unknown Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>Unknown / Unverified</span>
                  <span>{data?.compliance_overview.unknown} Parts ({Math.round((data?.compliance_overview.unknown || 0) / (totalCatalogParts || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-slate-700 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.compliance_overview.unknown || 0) / (totalCatalogParts || 1) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <Link 
            to="/compliance" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-2 group"
          >
            <span>View Compliance Issues</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Section 9: Match Quality */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Match Quality Statistics
              </h3>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>

            <div className="space-y-4 my-6">
              {/* Matched items */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>Matched Items</span>
                  <span>{data?.match_quality.matched} Items ({Math.round((data?.match_quality.matched || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.match_quality.matched || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Review items */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>Manual Review Needed</span>
                  <span>{data?.match_quality.review} Items ({Math.round((data?.match_quality.review || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.match_quality.review || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Unmatched items */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>Unmatched Items</span>
                  <span>{data?.match_quality.unmatched} Items ({Math.round((data?.match_quality.unmatched || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((data?.match_quality.unmatched || 0) / ((data?.match_quality.matched || 0) + (data?.match_quality.review || 0) + (data?.match_quality.unmatched || 0) || 1) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <Link 
            to="/upload" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-2 group"
          >
            <span>Ingest new BOM items for matching</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── SECTION 7 — EOL TIMELINE & SECTION 10 — SUPPLIER RISK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* EOL TIMELINE */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                EOL Forecast Timeline
              </h3>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>

            {!data?.eol_timeline || data.eol_timeline.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No EOL forecast dates set.</p>
            ) : (
              <div className="space-y-3.5 my-4">
                {data.eol_timeline.slice(0, 5).map((item) => (
                  <div key={item.part_number} className="flex items-center justify-between p-2.5 rounded bg-slate-950/40 border border-slate-900/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{item.part_number}</div>
                      <div className="text-[10px] text-slate-500">EOL Date: {item.eol_date}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-[11px] font-extrabold text-slate-300">
                        {item.years_remaining} years remaining
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.risk === 'Critical' 
                          ? 'bg-red-950/80 border-red-500/30 text-red-400' 
                          : item.risk === 'High' 
                          ? 'bg-orange-950/80 border-orange-500/30 text-orange-400'
                          : 'bg-amber-950/80 border-amber-500/30 text-amber-400'
                      }`}>
                        {item.risk} Risk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link 
            to="/lifecycle" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-2 group"
          >
            <span>View Lifecycle EOL Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* SECTION 10 — SUPPLIER RISK */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Supplier Sourcing Risk
              </h3>
              <Truck className="w-4 h-4 text-blue-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-4">
              <div className="p-3.5 rounded bg-slate-950/60 border border-slate-900">
                <div className="text-lg font-black text-emerald-400">{data?.supplier_risk.multi_source}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Multi-Sourced</div>
              </div>
              <div className="p-3.5 rounded bg-slate-950/60 border border-slate-900">
                <div className="text-lg font-black text-amber-400">{data?.supplier_risk.limited_source}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Limited Source</div>
              </div>
              <div className="p-3.5 rounded bg-slate-950/60 border border-slate-900 border-red-500/20">
                <div className="text-lg font-black text-red-500">{data?.supplier_risk.single_source}</div>
                <div className="text-[9px] text-red-400 font-bold uppercase mt-1">Single Source</div>
              </div>
            </div>

            {/* List Single Source Parts */}
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">
                Single Sourced Parts Listing
              </div>
              {!data?.supplier_risk.single_source_parts || data.supplier_risk.single_source_parts.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">No single-sourced component risk identified.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {data.supplier_risk.single_source_parts.slice(0, 3).map((part) => (
                    <div key={part.id} className="flex justify-between items-center p-2 rounded bg-slate-950/30 border border-slate-900 text-xs">
                      <span className="font-bold text-slate-300">{part.part_number}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Sourced only by: <span className="text-amber-500 font-bold">{part.supplier_name}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link 
            to="/suppliers" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-4 group"
          >
            <span>Review Supplier Risk</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── SECTION 11 — REPLACEMENTS & SECTION 12 — RECENT ALERTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* REPLACEMENTS OPPORTUNITIES */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Obsolete Part Replacement Candidates
              </h3>
              <Settings className="w-4 h-4 text-blue-400" />
            </div>

            {!data?.replacement_opportunities || data.replacement_opportunities.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No current replacement opportunities available.</p>
            ) : (
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="pb-2">Original Part</th>
                      <th className="pb-2">Lifecycle</th>
                      <th className="pb-2">Alternative candidate</th>
                      <th className="pb-2">Match confidence</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-xs">
                    {data.replacement_opportunities.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-2.5 font-bold text-slate-300">{item.original_part_number}</td>
                        <td className="py-2.5 text-red-400 font-bold uppercase text-[9px]">{item.original_lifecycle}</td>
                        <td className="py-2.5 font-bold text-emerald-400">{item.replacement_part_number}</td>
                        <td className="py-2.5 font-bold">{item.confidence_score}%</td>
                        <td className="py-2.5 text-right font-medium text-slate-400 text-[10px]">{item.review_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Link 
            to="/replacements" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-2 group"
          >
            <span>View Replacements</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* SECTION 12 — RECENT ALERTS PCNs */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent PCN / EOL Warnings
              </h3>
              <BellRing className="w-4 h-4 text-red-400" />
            </div>

            {!data?.recent_alerts || data.recent_alerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No new PCN alerts logged.</p>
            ) : (
              <div className="space-y-3.5 my-3">
                {data.recent_alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex gap-3 p-2.5 rounded bg-slate-950/45 border border-slate-900">
                    <div className="shrink-0 pt-0.5">
                      {alert.severity === 'High' ? (
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-extrabold text-white truncate">{alert.title}</h4>
                        <span className="text-[9px] text-slate-500 font-semibold">{new Date(alert.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link 
            to="/alerts" 
            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1.5 self-start pt-2 group"
          >
            <span>View All Alerts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── SECTION 8 — RECENT BOM UPLOADS ── */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent BOM Upload Activity
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold">Real-time matching resolution statuses</span>
        </div>

        {!data?.recent_boms || data.recent_boms.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-6">No BOMs uploaded in your account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="pb-3 pl-4">BOM Name</th>
                  <th className="pb-3">Uploaded Date</th>
                  <th className="pb-3">Total Components</th>
                  <th className="pb-3">Match Rate</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs text-slate-350">
                {data.recent_boms.map((bom) => (
                  <tr key={bom.id} className="hover:bg-slate-900/30 transition-colors duration-150">
                    <td className="py-3.5 pl-4 font-bold text-slate-200">{bom.name}</td>
                    <td className="py-3.5 font-medium text-slate-400">
                      {new Date(bom.uploaded_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 font-semibold">{bom.total_items} items</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${bom.match_rate}%` }} 
                          />
                        </div>
                        <span className="font-bold text-[10px]">{bom.match_rate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold">
                      <span className={bom.risk_score >= 70 ? 'text-red-400' : bom.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                        {bom.risk_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        bom.status === 'Completed' 
                          ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-400' 
                          : bom.status === 'Failed' 
                          ? 'bg-red-950/80 border-red-500/20 text-red-400' 
                          : 'bg-amber-950/80 border-amber-500/20 text-amber-400'
                      }`}>
                        {bom.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <Link 
                        to={`/bom/${bom.id}`} 
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded transition-all shadow shadow-blue-500/10 inline-flex items-center gap-1 group cursor-pointer"
                      >
                        <span>View Results</span>
                        <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      </Link>
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
