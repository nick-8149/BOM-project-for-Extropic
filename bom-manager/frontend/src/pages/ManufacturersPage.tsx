import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

interface Manufacturer {
  id: string;
  name: string;
  code: string;
  country_of_origin: string;
  website: string;
}

export default function ManufacturersPage() {
  const { token } = useAuth();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiRequest<Manufacturer[]>('/api/v1/manufacturers', { token })
      .then(setManufacturers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const newMfr = await apiRequest<Manufacturer>('/api/v1/manufacturers', {
        method: 'POST',
        token,
        body: { name, code, country_of_origin: country, website }
      });
      setManufacturers((prev) => [...prev, newMfr]);
      setName('');
      setCode('');
      setCountry('');
      setWebsite('');
    } catch (err: any) {
      setError(err.message || 'Failed to add manufacturer');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Manufacturers Catalog</h1>
        <p className="text-slate-400 text-sm">View and manage registered original equipment manufacturers (OEMs).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* List of Manufacturers */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Registered Manufacturers
          </h3>

          {loading ? (
            <div className="text-slate-500 text-xs">Loading manufacturers...</div>
          ) : error && manufacturers.length === 0 ? (
            <div className="text-red-400 text-xs">Error: {error}</div>
          ) : manufacturers.length === 0 ? (
            <div className="text-slate-500 text-xs italic">No manufacturers registered in database.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Country of Origin</th>
                    <th className="pb-3">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {manufacturers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{m.name}</td>
                      <td className="py-3 font-mono text-blue-400">{m.code || 'N/A'}</td>
                      <td className="py-3">{m.country_of_origin || 'N/A'}</td>
                      <td className="py-3">
                        {m.website ? (
                          <a href={m.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                            Visit Site
                          </a>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Manufacturer Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Add Manufacturer
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="Texas Instruments"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="TI"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Country of Origin</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="USA"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="https://www.ti.com"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {adding ? 'Adding...' : 'Add Manufacturer'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
