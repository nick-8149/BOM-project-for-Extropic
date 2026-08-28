import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Check, X, Cpu, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReplacementCandidate {
  id: string;
  original_part_id: string;
  replacement_part_id: string;
  replacement_part_number: string;
  replacement_description: string;
  replacement_manufacturer: string;
  reason: string;
  confidence_score: number;
  action_taken: string;
}

interface Part {
  id: string;
  part_number: string;
  category: string;
  lifecycle_info?: {
    lifecycle_status: string;
  } | null;
  compliance_info?: {
    rohs_status: string;
  } | null;
}

export default function ReplacementsPage() {
  const { token } = useAuth();
  const [obsoleteParts, setObsoleteParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    // Get all parts to filter obsolete ones
    apiRequest<Part[]>('/api/v1/parts', { token })
      .then((data) => {
        const obs = data.filter(
          (p) =>
            p.lifecycle_info?.lifecycle_status?.toUpperCase() === 'OBSOLETE' ||
            p.compliance_info?.rohs_status?.toUpperCase() === 'NON-COMPLIANT'
        );
        setObsoleteParts(obs);
        if (obs.length > 0) {
          setSelectedPart(obs[0]);
        }
      })
      .catch((e) => console.error("Error loading obsolete parts:", e))
      .finally(() => setLoading(false));
  }, [token]);

  // Load replacements when selected part changes
  useEffect(() => {
    if (!selectedPart) return;
    setLoadingCandidates(true);
    apiRequest<ReplacementCandidate[]>(`/api/v1/risk/replacements/${selectedPart.id}`, { token })
      .then(setCandidates)
      .catch((e) => console.error("Error loading replacements:", e))
      .finally(() => setLoadingCandidates(false));
  }, [selectedPart, token]);

  const handleAction = (candidateId: string, action: 'Accept' | 'Reject') => {
    // Update local state to mimic DB updates for this prototype walkthrough
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, action_taken: action } : c))
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <Cpu className="w-8 h-8 text-blue-500 glow-blue rounded" />
          Alternative Components & Replacements
        </h1>
        <p className="text-slate-400 text-sm font-medium">Select obsolete or non-compliant parts and evaluate recommended replacement candidates (R-05).</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl h-80 shimmer-bg" />
          <div className="lg:col-span-2 glass-panel rounded-2xl h-80 shimmer-bg" />
        </div>
      ) : obsoleteParts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs italic">
          No obsolete or non-compliant parts currently registered in the database catalog.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Obsolete parts selection list */}
          <div className="glass-panel rounded-2xl p-6 h-fit space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-3 border-b border-slate-800/60">
              Select Problem Part
            </h3>
            
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {obsoleteParts.map((p) => {
                const isSelected = selectedPart?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPart(p)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/15'
                        : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-extrabold flex items-center justify-between gap-2">
                      <span className="font-mono truncate">{p.part_number}</span>
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/10'
                      }`}>
                        Issue
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1.5 font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {p.category || 'Component'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Replacement candidates cards */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-4 mb-6 gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Alternatives for {selectedPart?.part_number}</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                ({candidates.length} candidates found)
              </span>
            </div>

            {loadingCandidates ? (
              <div className="space-y-4">
                <div className="h-20 w-full shimmer-bg rounded" />
                <div className="h-20 w-full shimmer-bg rounded" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-slate-500 text-xs italic text-center py-12">
                No compatible replacement components registered matching specifications.
              </div>
            ) : (
              <div className="space-y-4">
                {candidates.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-950/40 border border-slate-905 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 transition-colors duration-150">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Link to={`/parts/${c.replacement_part_id}`} className="font-extrabold text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors font-mono">
                          {c.replacement_part_number}
                        </Link>
                        <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {c.confidence_score}% Fit
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-xs leading-relaxed max-w-lg">
                        {c.replacement_description || 'No description provided for alternative component.'}
                      </p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider pt-1">
                        <span>OEM: {c.replacement_manufacturer}</span>
                        <span>Reason: {c.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.action_taken === 'Accept' ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : c.action_taken === 'Reject' ? (
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(c.id, 'Reject')}
                            className="p-2 bg-slate-900 border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all duration-150 cursor-pointer"
                            title="Reject Candidate"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, 'Accept')}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-150 cursor-pointer shadow-md shadow-blue-500/10"
                            title="Accept Alternative"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
