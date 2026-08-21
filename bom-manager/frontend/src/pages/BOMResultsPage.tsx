import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

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
      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
        <CheckCircle2 className="w-3 h-3" /> Matched
      </span>
    );
  }
  if (s === 'suggested match') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
        <HelpCircle className="w-3 h-3" /> Suggested
      </span>
    );
  }
  if (s === 'manual review') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-bold uppercase">
        <AlertTriangle className="w-3 h-3" /> Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">
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
      .finally(() => setLoading(false));
  }, [bomId, token]);

  if (loading) return <div className="text-slate-400 text-sm">Loading BOM data...</div>;
  if (!bom) return <div className="text-red-400 text-sm">BOM not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/upload" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Upload
      </Link>

      {/* BOM Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{bom.name}</h1>
            <p className="text-xs text-slate-500 mt-1">File: {bom.filename} • Uploaded: {new Date(bom.uploaded_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold text-slate-200">{bom.total_items}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold text-emerald-400">{bom.matched_items}</div>
              <div className="text-[10px] text-emerald-500 uppercase tracking-wider">Matched</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold text-red-400">{bom.unmatched_items}</div>
              <div className="text-[10px] text-red-500 uppercase tracking-wider">Unmatched</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold text-amber-400">{bom.review_items}</div>
              <div className="text-[10px] text-amber-500 uppercase tracking-wider">Review</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOM Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
          BOM Line Items ({items.length})
        </h3>
        {items.length === 0 ? (
          <div className="text-slate-500 text-xs italic">No items found in this BOM.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="pb-3 pr-2">#</th>
                  <th className="pb-3 pr-4">Part Number</th>
                  <th className="pb-3 pr-4">Manufacturer</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-2">Qty</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-2">Confidence</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-2 text-slate-500">{item.serial_number}</td>
                    <td className="py-3 pr-4 font-mono font-semibold text-slate-200">
                      {item.matched_part_id ? (
                        <Link to={`/parts/${item.matched_part_id}`} className="text-blue-400 hover:underline">
                          {item.original_part_number}
                        </Link>
                      ) : (
                        item.original_part_number
                      )}
                    </td>
                    <td className="py-3 pr-4">{item.original_manufacturer || 'N/A'}</td>
                    <td className="py-3 pr-4 text-slate-400 max-w-xs truncate">{item.original_description || '—'}</td>
                    <td className="py-3 pr-2">{item.quantity}</td>
                    <td className="py-3 pr-4"><StatusBadge status={item.validation_status} /></td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.confidence_score >= 90 ? 'bg-emerald-500' :
                              item.confidence_score >= 70 ? 'bg-amber-500' :
                              item.confidence_score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8">{item.confidence_score}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500 text-[10px]">{item.action_taken || '—'}</td>
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
