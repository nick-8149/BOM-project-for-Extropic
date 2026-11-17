import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchIdentitySummary } from '../api/identityClient';
import type { IdentityResolutionSummary } from '../api/identityClient';
import IdentityReviewTable from '../components/IdentityResolution/IdentityReviewTable';
import { AlertTriangle, CheckCircle, HelpCircle, FileX } from 'lucide-react';

export default function IdentityResolutionPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<IdentityResolutionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchIdentitySummary(token);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [token]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Identity Resolution Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Review ambiguous part identities and map internal parts before lifecycle lookup.</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-24 shimmer-bg" />
           ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
             <div className="flex justify-between items-start">
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Resolved</span>
               <CheckCircle className="text-emerald-500 w-5 h-5" />
             </div>
             <div className="text-3xl font-bold text-slate-100 mt-2">{summary.resolved}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
             <div className="flex justify-between items-start">
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Needs MPN Mapping</span>
               <AlertTriangle className="text-amber-500 w-5 h-5" />
             </div>
             <div className="text-3xl font-bold text-slate-100 mt-2">{summary.requires_mpn_mapping}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
             <div className="flex justify-between items-start">
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Ambiguous</span>
               <HelpCircle className="text-blue-500 w-5 h-5" />
             </div>
             <div className="text-3xl font-bold text-slate-100 mt-2">{summary.ambiguous}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
             <div className="flex justify-between items-start">
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Missing Data</span>
               <FileX className="text-rose-500 w-5 h-5" />
             </div>
             <div className="text-3xl font-bold text-slate-100 mt-2">{summary.missing_data}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <IdentityReviewTable onMappingComplete={loadSummary} />
      </div>
    </div>
  );
}
