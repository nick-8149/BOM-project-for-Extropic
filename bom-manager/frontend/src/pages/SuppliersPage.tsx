import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, Plus } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  code: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  is_authorized: boolean;
}

export default function SuppliersPage() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiRequest<Supplier[]>('/api/v1/suppliers', { token })
      .then(setSuppliers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const newSup = await apiRequest<Supplier>('/api/v1/suppliers', {
        method: 'POST',
        token,
        body: {
          name,
          code,
          location,
          contact_email: email || null,
          contact_phone: phone || null,
          is_authorized: isAuthorized,
          status: 'Active'
        }
      });
      setSuppliers((prev) => [...prev, newSup]);
      setName('');
      setCode('');
      setLocation('');
      setEmail('');
      setPhone('');
      setIsAuthorized(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add supplier');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Supplier Network</h1>
        <p className="text-slate-400 text-sm">View, track, and manage distributors and supply chain channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* List of Suppliers */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Approved Distributors
          </h3>

          {loading ? (
            <div className="text-slate-500 text-xs">Loading suppliers...</div>
          ) : error && suppliers.length === 0 ? (
            <div className="text-red-400 text-xs">Error: {error}</div>
          ) : suppliers.length === 0 ? (
            <div className="text-slate-500 text-xs italic">No suppliers registered in database.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{s.name}</td>
                      <td className="py-3 font-mono text-slate-400">{s.code || 'N/A'}</td>
                      <td className="py-3">{s.location || 'N/A'}</td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span>{s.contact_email || 'N/A'}</span>
                          <span className="text-[10px] text-slate-500">{s.contact_phone}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {s.is_authorized ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">
                            <AlertTriangle className="w-3.5 h-3.5" /> Unauthorized
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Supplier Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Register Supplier
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
                placeholder="Mouser Electronics"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="MOU"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="USA"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="sales@mouser.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="+1-800-346-6873"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isAuthorized"
                checked={isAuthorized}
                onChange={(e) => setIsAuthorized(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="isAuthorized" className="text-xs text-slate-300 cursor-pointer">
                Authorized / Approved Channel
              </label>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 mt-4"
            >
              <Plus className="w-3.5 h-3.5" />
              {adding ? 'Adding...' : 'Register Supplier'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
