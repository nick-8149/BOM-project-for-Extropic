import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Cpu, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Part {
  id: string;
  part_number: string;
  description: string;
  category: string;
  package_type: string;
  standard_cert: string;
}

export default function PartSearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial parts load
  useEffect(() => {
    setLoading(true);
    apiRequest<Part[]>('/api/v1/parts', { token })
      .then(setParts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const results = await apiRequest<Part[]>(`/api/v1/parts/search?q=${encodeURIComponent(query)}`, { token });
      setParts(results);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Single Part Search</h1>
        <p className="text-slate-400 text-sm">Query local hardware catalogs, retrieve EOL estimations, standards, and alternative components.</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search MPN (e.g. MSP430, OP177, D38999...)"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 max-w-xl">
          {error}
        </div>
      )}

      {/* Grid of Results */}
      {loading && parts.length === 0 ? (
        <div className="text-slate-500 text-sm">Loading catalog...</div>
      ) : parts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
          No matching components found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part) => (
            <div key={part.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Cpu className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                      {part.category || 'Component'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {part.standard_cert || 'Standard'}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition-colors mb-2">
                  {part.part_number}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                  {part.description || 'No description available.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                <span>Pkg: {part.package_type || 'N/A'}</span>
                <Link
                  to={`/parts/${part.id}`}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-400 font-semibold"
                >
                  View Details
                  <LinkIcon className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
