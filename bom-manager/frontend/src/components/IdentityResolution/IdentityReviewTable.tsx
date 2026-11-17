import { useState, useEffect } from 'react';
import { fetchIdentityRecords } from '../../api/identityClient';
import type { IdentityResolutionRecord } from '../../api/identityClient';
import { useAuth } from '../../context/AuthContext';
import IdentityActionDialog from './IdentityActionDialog';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onMappingComplete: () => void;
}

export default function IdentityReviewTable({ onMappingComplete }: Props) {
  const { token } = useAuth();
  const [records, setRecords] = useState<IdentityResolutionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<IdentityResolutionRecord | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRecords = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchIdentityRecords(token, {
        page,
        page_size: 50,
        search: debouncedSearch,
        resolution_status: statusFilter,
        classification: classFilter
      });
      setRecords(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [token, page, debouncedSearch, statusFilter, classFilter]);

  const handleActionSuccess = () => {
    setSelectedRecord(null);
    loadRecords();
    onMappingComplete();
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[700px]">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap bg-slate-900/50">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search parts or manufacturers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REQUIRES_MPN_MAPPING">Needs MPN Mapping</option>
            <option value="AMBIGUOUS">Ambiguous</option>
            <option value="MISSING_DATA">Missing Data</option>
          </select>

          <select 
            value={classFilter} 
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="MPN">MPN</option>
            <option value="IPN">IPN</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 text-sm m-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <th className="p-4 font-semibold w-1/4">Part Number (BOM)</th>
              <th className="p-4 font-semibold w-1/4">Manufacturer (BOM)</th>
              <th className="p-4 font-semibold">Classification</th>
              <th className="p-4 font-semibold">Resolution</th>
              <th className="p-4 font-semibold">Verification</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading && records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>Loading identity records...</div>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No matching records found.
                </td>
              </tr>
            ) : (
              records.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-slate-200">{r.internal_part_number || '-'}</div>
                    {r.manufacturer_part_number && (
                      <div className="text-xs text-blue-400 mt-1 flex items-center">
                        <span className="text-slate-500 mr-1">MPN:</span> {r.manufacturer_part_number}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-300 truncate max-w-[200px]" title={r.manufacturer_raw || ''}>
                    {r.manufacturer_raw || '-'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${r.part_classification === 'MPN' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-fuchsia-900/40 text-fuchsia-400'}`}>
                      {r.part_classification}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      r.resolution_status === 'RESOLVED' ? 'bg-emerald-900/40 text-emerald-400' : 
                      r.resolution_status === 'AMBIGUOUS' ? 'bg-amber-900/40 text-amber-400' :
                      'bg-rose-900/40 text-rose-400'
                    }`}>
                      {r.resolution_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    {r.verification_status ? (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        r.verification_status === 'VERIFIED' ? 'bg-emerald-900/40 text-emerald-400' :
                        r.verification_status === 'DRAFT' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {r.verification_status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedRecord(r)}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-900/30 transition-colors"
                    >
                      {r.resolution_status === 'RESOLVED' ? 'View' : 'Review'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-sm text-slate-400">
        <div>
          Showing {records.length} of {total} records
        </div>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            disabled={records.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedRecord && (
        <IdentityActionDialog 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
