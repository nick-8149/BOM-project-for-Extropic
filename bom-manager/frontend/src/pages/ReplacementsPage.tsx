import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';
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
      .finally(() => setLoading(false));
  }, [token]);

  // Load replacements when selected part changes
  useEffect(() => {
    if (!selectedPart) return;
    setLoadingCandidates(true);
    apiRequest<ReplacementCandidate[]>(`/api/v1/risk/replacements/${selectedPart.id}`, { token })
      .then(setCandidates)
      .finally(() => setLoadingCandidates(false));
  }, [selectedPart, token]);

  const handleAction = (candidateId: string, action: 'Accept' | 'Reject') => {
    // Update local state to mimic DB updates for this prototype walkthrough
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, action_taken: action } : c))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Alternative Components & Replacements</h1>
        <p className="text-slate-400 text-sm">Select obsolete or non-compliant parts and evaluate recommended replacement candidates (R-05).</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-xs">Scanning catalog...</div>
      ) : obsoleteParts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs italic">
          No obsolete or non-compliant parts currently registered in the database catalog.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Obsolete parts menu */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Select Problem Part
            </h3>
            <div className="space-y-2">
              {obsoleteParts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPart(p)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                    selectedPart?.id === p.id
                      ? 'bg-blue-600/10 border-blue-500 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{p.part_number}</span>
                    <span className="text-[9px] uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.25 rounded">
                      Issue
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px] mt-1">{p.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Replacement candidates details */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 mb-4 flex items-center justify-between">
              <span>RoHS Compliant Alternatives for {selectedPart?.part_number}</span>
              <span className="text-xs text-slate-500 lowercase">({candidates.length} found)</span>
            </h3>

            {loadingCandidates ? (
              <div className="text-slate-500 text-xs">Matching alternative metrics...</div>
            ) : candidates.length === 0 ? (
              <div className="text-slate-500 text-xs italic">No compatible replacement components registered matching specifications.</div>
            ) : (
              <div className="space-y-4">
                {candidates.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/parts/${c.replacement_part_id}`} className="font-bold text-sm text-blue-400 hover:underline">
                          {c.replacement_part_number}
                        </Link>
                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.25 rounded font-mono">
                          {c.confidence_score}% Fit
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed max-w-lg">{c.replacement_description}</p>
                      <div className="flex gap-x-4 text-[10px] text-slate-500 mt-2">
                        <span>OEM: {c.replacement_manufacturer}</span>
                        <span>Reason: {c.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.action_taken === 'Accept' ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : c.action_taken === 'Reject' ? (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(c.id, 'Reject')}
                            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded transition-all cursor-pointer"
                            title="Reject Candidate"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, 'Accept')}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-all cursor-pointer"
                            title="Accept Alternative"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
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
