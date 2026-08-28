import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, XCircle, Search, Layers, ClipboardList } from 'lucide-react';

interface BOMHeader {
  id: string;
  name: string;
  filename: string;
  status: string;
  total_items: number;
  matched_items: number;
  unmatched_items: number;
  review_items: number;
  uploaded_at: string;
}

interface BOMItem {
  id: string;
  serial_number: number;
  original_part_number: string;
  original_manufacturer: string;
  original_supplier: string;
  original_description: string;
  quantity: number;
  validation_status: string;
  confidence_score: number;
  matched_part_id: string | null;
  suggested_part_number: string | null;
  action_taken: string | null;
  notes: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'matched') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> Matched
      </span>
    );
  }
  if (s === 'suggested match') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
        <HelpCircle className="w-3 h-3" /> Suggested
      </span>
    );
  }
  if (s === 'manual review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider pulse-highlight">
        <AlertTriangle className="w-3 h-3" /> Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
      <XCircle className="w-3 h-3" /> Unmatched
    </span>
  );
}

export default function BOMResultsPage() {
  const { bomId } = useParams<{ bomId: string }>();
  const { token } = useAuth();
  const [bom, setBom] = useState<BOMHeader | null>(null);
  const [items, setItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!bomId) return;
    Promise.all([
      apiRequest<BOMHeader>(`/api/v1/bom/${bomId}`, { token }),
      apiRequest<BOMItem[]>(`/api/v1/bom/${bomId}/items`, { token })
    ])
      .then(([bomData, itemsData]) => {
        setBom(bomData);
        setItems(itemsData);
      })
      .catch((e) => console.error("Error loading BOM results:", e))
      .finally(() => setLoading(false));
  }, [bomId, token]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Back Link skeleton */}
        <div className="h-4 w-32 bg-slate-900 border border-slate-800 rounded shimmer-bg" />
        
        {/* Header Summary skeleton */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-slate-900 border border-slate-800 rounded shimmer-bg" />
            <div className="h-4 w-64 bg-slate-900 border border-slate-850 rounded shimmer-bg" />
          </div>
          <div className="flex gap-3">
            <div className="h-14 w-20 bg-slate-900 border border-slate-850 rounded-xl shimmer-bg" />
            <div className="h-14 w-20 bg-slate-900 border border-slate-850 rounded-xl shimmer-bg" />
            <div className="h-14 w-20 bg-slate-900 border border-slate-850 rounded-xl shimmer-bg" />
          </div>
        </div>

        {/* List Skeleton */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="h-6 w-32 bg-slate-900 border border-slate-800 rounded shimmer-bg" />
          <div className="space-y-2 pt-4">
            <div className="h-8 w-full bg-slate-900/60 border border-slate-850 rounded shimmer-bg" />
            <div className="h-8 w-full bg-slate-900/60 border border-slate-850 rounded shimmer-bg" />
            <div className="h-8 w-full bg-slate-900/60 border border-slate-850 rounded shimmer-bg" />
            <div className="h-8 w-full bg-slate-900/60 border border-slate-850 rounded shimmer-bg" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!bom) return <div className="text-red-400 text-sm font-semibold">BOM records not found.</div>;

  // Search and status filters
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.original_part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.original_manufacturer && item.original_manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.original_description && item.original_description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      item.validation_status.toUpperCase() === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="space-y-1">
          <Link to="/upload" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Ingestion
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-500 glow-blue rounded" />
            {bom.name}
          </h1>
          <p className="text-xs text-slate-400 font-medium">File: {bom.filename} • Analyzed on {new Date(bom.uploaded_at).toLocaleString()}</p>
        </div>

        {/* Counter cards in header */}
        <div className="flex flex-wrap gap-3">
          <div className="glass-panel border-slate-800/50 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-xl font-black text-white">{bom.total_items}</div>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total</div>
          </div>
          <div className="glass-panel border-emerald-500/10 bg-emerald-500/5 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-xl font-black text-emerald-400">{bom.matched_items}</div>
            <div className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">Matched</div>
          </div>
          <div className="glass-panel border-amber-500/10 bg-amber-500/5 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-xl font-black text-amber-400">{bom.review_items}</div>
            <div className="text-[9px] text-amber-500/70 font-bold uppercase tracking-wider">Review</div>
          </div>
          <div className="glass-panel border-red-500/10 bg-red-500/5 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-xl font-black text-red-400">{bom.unmatched_items}</div>
            <div className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider">Unmatched</div>
          </div>
        </div>
      </div>

      {/* BOM Items Table Card */}
      <div className="glass-panel rounded-2xl p-6">
        {/* Toolbar: Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              BOM Line Items ({filteredItems.length})
            </h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search part number, description..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
            
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="MATCHED">Matched</option>
              <option value="SUGGESTED MATCH">Suggested Matches</option>
              <option value="MANUAL REVIEW">Manual Review</option>
              <option value="UNMATCHED">Unmatched</option>
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-slate-500 text-xs italic text-center py-12">
            No components matched the specified filters. Try refining your keywords.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="pb-3 pl-3">Line #</th>
                  <th className="pb-3">Part Number</th>
                  <th className="pb-3">Manufacturer</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Qty</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Match Confidence</th>
                  <th className="pb-3 pr-3 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/30 transition-colors duration-150 group">
                    <td className="py-3.5 pl-3 text-slate-500 font-medium">{item.serial_number}</td>
                    <td className="py-3.5 font-mono font-bold text-slate-200">
                      {item.matched_part_id ? (
                        <Link to={`/parts/${item.matched_part_id}`} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                          {item.original_part_number}
                        </Link>
                      ) : (
                        item.original_part_number
                      )}
                    </td>
                    <td className="py-3.5 font-medium">{item.original_manufacturer || '—'}</td>
                    <td className="py-3.5 text-slate-400 max-w-xs truncate">{item.original_description || '—'}</td>
                    <td className="py-3.5 font-semibold text-slate-200">{item.quantity}</td>
                    <td className="py-3.5"><StatusBadge status={item.validation_status} /></td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-950/80 border border-slate-800/50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.confidence_score >= 90 ? 'bg-emerald-500 glow-emerald' :
                              item.confidence_score >= 70 ? 'bg-amber-500 glow-amber' :
                              item.confidence_score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold w-8">{item.confidence_score}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-3 text-right text-slate-500 font-medium italic">
                      {item.action_taken || item.notes || '—'}
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
