import { useState, useEffect } from 'react';
import { Brain, Search, Target, ShieldAlert, Cpu, Bot, ChevronDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AIComparisonModal } from '../components/AIComparisonModal';
import { AIExplanationChat } from '../components/AIExplanationChat';
import { AIReviewModal } from '../components/AIReviewModal';

interface Part {
  id: string;
  part_number: string;
  description?: string;
  category?: string;
  package_type?: string;
  lifecycle_status?: string;
  rohs_status?: string;
}

interface AIAnalysis {
  summary: string;
  recommended_candidate: string | null;
  confidence: 'high' | 'medium' | 'low';
  candidates: any[];
  warnings: string[];
  missing_data: string[];
  validation_required: string[];
  reasoning: string;
}

export default function AIReplacementsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [replacementGoal, setReplacementGoal] = useState('eol');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysis | null>(null);
  const [originalContext, setOriginalContext] = useState<any>(null);

  // Modals state
  const [compareCandidate, setCompareCandidate] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [reviewCandidate, setReviewCandidate] = useState<any>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const delay = setTimeout(() => {
      setIsSearching(true);
      apiRequest<Part[]>(`/api/v1/parts/search?q=${encodeURIComponent(searchQuery)}`, { token })
        .then(data => {
          setSearchResults(data);
          setShowDropdown(true);
        })
        .catch(() => showToast('Failed to search parts', 'error'))
        .finally(() => setIsSearching(false));
    }, 300);
    
    return () => clearTimeout(delay);
  }, [searchQuery, token, showToast]);

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery(part.part_number);
    setShowDropdown(false);
    setAnalysisResult(null); // Reset analysis when new part selected
  };

  const handleAnalyze = async () => {
    if (!selectedPart) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setOriginalContext(null);
    
    try {
      const data = await apiRequest<any>(`/api/v1/replacements/ai-analyze/${selectedPart.id}`, {
        method: 'POST',
        token,
        body: { replacement_goal: replacementGoal }
      });
      
      setOriginalContext(data.original_part);
      
      if (data.error) {
        showToast(data.message, 'error');
      } else {
        setAnalysisResult(data.analysis);
        showToast('AI analysis completed successfully.', 'success');
      }
    } catch (error) {
      showToast('Failed to connect to AI Service.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (conf: string) => {
    switch(conf) {
      case 'high': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-500 glow-blue rounded" />
            AI Smart Replacement Engine
          </h1>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
            <span className="font-bold text-amber-400">DECISION SUPPORT ONLY: </span>
            The AI recommendation is based strictly on available database metrics. It cannot evaluate missing specifications such as exact electrical ratings or footprint layouts. Engineering validation is required before component substitution.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-30">
        
        {/* Search */}
        <div className="md:col-span-5 space-y-2 relative">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Component Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by part number or description..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {isSearching && (
              <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            )}
          </div>
          
          {/* Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPart(p)}
                  className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono text-sm font-bold text-blue-400">{p.part_number}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[300px]">{p.description || p.category}</div>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{p.lifecycle_status}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Goal Selection */}
        <div className="md:col-span-5 space-y-2 relative">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Replacement Goal
          </label>
          <div className="relative">
            <select
              value={replacementGoal}
              onChange={(e) => setReplacementGoal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-200 appearance-none focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="eol">End of Life (EOL) Replacement</option>
              <option value="compliance">RoHS / Compliance Fix</option>
              <option value="risk_mitigation">Supply Chain Risk Mitigation</option>
              <option value="cost_reduction">Cost Reduction Alternative</option>
            </select>
            <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Action */}
        <div className="md:col-span-2 flex items-end">
          <button
            onClick={handleAnalyze}
            disabled={!selectedPart || isAnalyzing}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group"
          >
            {isAnalyzing ? (
              <>
                <Bot className="w-4 h-4 animate-pulse text-blue-200" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Analyze with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Area */}
      {isAnalyzing && (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <Brain className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-sm font-bold text-slate-300">AI is fetching data and analyzing alternatives...</div>
          <p className="text-xs text-slate-500 max-w-sm text-center">Cross-referencing lifecycle states, compliance records, and parametric descriptors.</p>
        </div>
      )}

      {!isAnalyzing && analysisResult && originalContext && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInUp">
          
          {/* Left Column: Original Part & Summary */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Original Component Card */}
            <div className="glass-panel rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800/50 rounded-bl-full -z-10 blur-2xl" />
              <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/30">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Original Component
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="font-mono text-xl font-black text-white">{originalContext.part_number}</div>
                  <div className="text-xs text-slate-400 mt-1">{originalContext.description}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Category</div>
                    <div className="text-sm font-semibold text-slate-300">{originalContext.category || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Package</div>
                    <div className="text-sm font-semibold text-slate-300">{originalContext.package_type || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Lifecycle</div>
                    <div className="text-sm font-semibold text-slate-300 flex items-center gap-1">
                      {originalContext.lifecycle_status === 'Obsolete' && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                      {originalContext.lifecycle_status || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Compliance</div>
                    <div className="text-sm font-semibold text-slate-300">{originalContext.rohs_status || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="glass-panel rounded-2xl overflow-hidden relative border-blue-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/20 rounded-bl-full -z-10 blur-2xl" />
              <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-blue-950/30">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> AI Evaluation
                </h3>
                <span className={`text-[9px] px-2.5 py-1 rounded-full border uppercase font-bold tracking-wider flex items-center gap-1 ${getConfidenceColor(analysisResult.confidence)}`}>
                  {analysisResult.confidence} Confidence
                </span>
              </div>
              
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {analysisResult.summary}
                  </p>
                </div>

                {analysisResult.missing_data.length > 0 && (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Missing Specifications</h4>
                    <ul className="space-y-1.5">
                      {analysisResult.missing_data.map((item, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-slate-600 mt-0.5">•</span> <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.validation_required.length > 0 && (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Required Validations
                    </h4>
                    <ul className="space-y-1.5">
                      {analysisResult.validation_required.map((item, i) => (
                        <li key={i} className="text-xs text-slate-300 font-medium flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">→</span> <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl border border-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Brain className="w-4 h-4" /> Ask AI about this analysis
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Ranked Candidates */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
              Ranked Candidates
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                {analysisResult.candidates.length}
              </span>
            </h3>

            {analysisResult.candidates.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-slate-700">
                <span className="text-slate-500 text-sm font-medium">No suitable candidates found by the AI.</span>
              </div>
            ) : (
              analysisResult.candidates.map((candidate, idx) => (
                <div key={candidate.part_id} className={`glass-panel rounded-2xl p-5 relative overflow-hidden transition-all hover:border-slate-700 ${idx === 0 ? 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : ''}`}>
                  
                  {/* Rank Badge */}
                  <div className={`absolute top-0 left-0 w-8 h-8 rounded-br-2xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {idx + 1}
                  </div>

                  <div className="ml-8 flex flex-col md:flex-row gap-6">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono font-bold text-lg text-blue-400">{candidate.part_number}</div>
                          <div className="text-xs text-slate-400 mt-0.5">OEM: {candidate.manufacturer || 'Unknown'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                            {candidate.compatibility_score}<span className="text-sm text-slate-600">%</span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Est. Match</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                        {candidate.reasoning}
                      </p>

                      {candidate.warnings.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-1">Warnings</div>
                          <ul className="space-y-1">
                            {candidate.warnings.map((w: string, i: number) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/50 mt-0.5 shrink-0" />
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="md:w-48 shrink-0 flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                      <button
                        onClick={() => setCompareCandidate(candidate)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      >
                        Compare Data
                      </button>
                      <button
                        onClick={() => setReviewCandidate(candidate)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-colors"
                      >
                        Submit Review
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {compareCandidate && (
        <AIComparisonModal
          isOpen={true}
          onClose={() => setCompareCandidate(null)}
          original={originalContext}
          candidate={compareCandidate} // the AI candidate schema (doesn't have all raw DB fields, but enough for comparison demo)
          compatibility={compareCandidate.compatibility}
        />
      )}

      {reviewCandidate && (
        <AIReviewModal
          isOpen={true}
          onClose={() => setReviewCandidate(null)}
          candidateId={`rep-${reviewCandidate.part_id}`} // Assuming the ID maps this way from the backend creation
          partNumber={reviewCandidate.part_number}
          onSuccess={() => {
            // Ideally we'd refresh the list, but for now just close
          }}
        />
      )}

      <AIExplanationChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        partId={selectedPart?.id || ''}
        analysisSummary={analysisResult?.summary || ''}
      />
    </div>
  );
}
