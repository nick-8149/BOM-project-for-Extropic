import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Cpu, ArrowUpRight, Shield } from 'lucide-react';
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
    setLoading(true);
    setError('');
    try {
      const path = query.trim() 
        ? `/api/v1/parts/search?q=${encodeURIComponent(query)}`
        : '/api/v1/parts';
      const results = await apiRequest<Part[]>(path, { token });
      setParts(results);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <Search className="w-8 h-8 text-blue-500 glow-blue rounded" />
          Component Catalog Search
        </h1>
        <p className="text-slate-400 text-sm font-medium">Query local hardware catalogs, retrieve EOL estimations, standards compliance, and alternates.</p>
      </div>

      {/* Search Form Panel */}
      <div className="glass-panel rounded-2xl p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-650"
              placeholder="Search by part number, category, standards, description..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-blue-600/10 disabled:opacity-50 cursor-pointer text-center"
          >
            {loading ? 'Searching...' : 'Search Catalog'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="glass-panel rounded-2xl p-6 h-40 shimmer-bg" />
          <div className="glass-panel rounded-2xl p-6 h-40 shimmer-bg" />
          <div className="glass-panel rounded-2xl p-6 h-40 shimmer-bg" />
        </div>
      ) : parts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs italic">
          No components matched the specified parameters in your local repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parts.map((part) => (
            <div 
              key={part.id} 
              className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Cpu className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/10 px-2 py-0.5 rounded-full">
                      {part.category || 'Component'}
                    </span>
                  </div>
                  {part.standard_cert && (
                    <span className="text-[9px] bg-slate-950/80 text-slate-400 border border-slate-850 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {part.standard_cert}
                    </span>
                  )}
                </div>
                
                <h3 className="font-extrabold text-base text-slate-200 group-hover:text-blue-400 transition-colors duration-150 mb-2 truncate">
                  {part.part_number}
                </h3>
                
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 mb-6">
                  {part.description || 'No datasheet description populated in local catalog parameters.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/40 pt-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>Pkg: {part.package_type || 'Unknown'}</span>
                <Link
                  to={`/parts/${part.id}`}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold transition-colors group-hover:underline"
                >
                  Details
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
