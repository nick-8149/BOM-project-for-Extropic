import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Settings, Users, Database, Shield, Plus, Link, Check, X } from 'lucide-react';

interface Alias {
  id: string;
  requested_manufacturer: string;
  requested_mpn: string;
  returned_manufacturer: string;
  returned_mpn: string;
  variant_type: string;
  verification_status: string;
  evidence?: string;
  created_at: string;
}

interface Candidate {
  id: string;
  requested_manufacturer: string;
  requested_mpn: string;
  returned_manufacturer: string;
  returned_mpn: string;
  proposed_variant_type?: string;
  provider: string;
  evidence: string;
  review_status: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('analyst');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [aliases, setAliases] = useState<Alias[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'aliases'>('users');

  // Alias form
  const [aliasReqMfr, setAliasReqMfr] = useState('');
  const [aliasReqMpn, setAliasReqMpn] = useState('');
  const [aliasRetMfr, setAliasRetMfr] = useState('');
  const [aliasRetMpn, setAliasRetMpn] = useState('');
  const [aliasVariant, setAliasVariant] = useState('PACKAGING_VARIANT');
  const [aliasEvidence, setAliasEvidence] = useState('');
  const [aliasError, setAliasError] = useState('');

  const fetchAliases = async () => {
    try {
      const data = await apiRequest<Alias[]>('/api/v1/aliases/');
      setAliases(data);
      const candData = await apiRequest<Candidate[]>('/api/v1/aliases/candidates');
      setCandidates(candData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setUsers([currentUser as unknown as User]);
      fetchAliases();
    }
    setLoading(false);
  }, [currentUser]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      const newUser = await apiRequest<User>('/api/v1/auth/register', {
        method: 'POST',
        body: { username, email, password, role }
      });
      setUsers((prev) => [...prev, newUser]);
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('analyst');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    setAliasError('');
    try {
      await apiRequest('/api/v1/aliases/', {
        method: 'POST',
        body: {
          requested_manufacturer: aliasReqMfr,
          requested_mpn: aliasReqMpn,
          returned_manufacturer: aliasRetMfr,
          returned_mpn: aliasRetMpn,
          variant_type: aliasVariant,
          evidence: aliasEvidence,
          verification_status: 'DRAFT'
        }
      });
      fetchAliases();
      setAliasReqMfr(''); setAliasReqMpn(''); setAliasRetMfr(''); setAliasRetMpn(''); setAliasEvidence('');
    } catch (err: any) {
      setAliasError(err.message || 'Failed to create alias');
    }
  };

  const handleVerifyAlias = async (id: string, status: string) => {
    try {
      await apiRequest(`/api/v1/aliases/${id}?verification_status=${status}`, {
        method: 'PUT'
      });
      fetchAliases();
    } catch (err: any) {
      alert(err.message || 'Failed to update alias');
    }
  };

  const handleCandidateAction = async (id: string, action: 'CONVERT' | 'REJECT') => {
    try {
      await apiRequest(`/api/v1/aliases/candidates/${id}/convert`, {
        method: 'POST',
        body: { action }
      });
      fetchAliases();
    } catch (err: any) {
      alert(err.message || `Failed to ${action.toLowerCase()} candidate`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-400" />
            Administration Panel
          </h1>
          <p className="text-slate-400 text-sm">Manage users, roles, and system configuration settings.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'users' ? 'Register User' : 'Create Alias'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`text-sm font-semibold uppercase tracking-wider px-2 py-1 ${activeTab === 'users' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('aliases')}
          className={`text-sm font-semibold uppercase tracking-wider px-2 py-1 ${activeTab === 'aliases' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Alias Review
        </button>
      </div>

      {/* System Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">SQLite (Development)</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Database Engine</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">JWT / bcrypt</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Auth Protocol</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">{users.length}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Registered Users</div>
          </div>
        </div>
      </div>

      {/* User Registration Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Create User Account
          </h3>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 mb-4">{error}</div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Username *</label>
              <input
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Email *</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Password *</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="analyst">Analyst</option>
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={adding}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {adding ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && activeTab === 'aliases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Create Alias Candidate
          </h3>
          {aliasError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 mb-4">{aliasError}</div>
          )}
          <form onSubmit={handleCreateAlias} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Req. Manufacturer *</label>
                <input required value={aliasReqMfr} onChange={(e) => setAliasReqMfr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Req. MPN *</label>
                <input required value={aliasReqMpn} onChange={(e) => setAliasReqMpn(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ret. Manufacturer *</label>
                <input required value={aliasRetMfr} onChange={(e) => setAliasRetMfr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ret. MPN *</label>
                <input required value={aliasRetMpn} onChange={(e) => setAliasRetMpn(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Variant Type</label>
              <select value={aliasVariant} onChange={(e) => setAliasVariant(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200">
                <option value="PACKAGING_VARIANT">PACKAGING_VARIANT</option>
                <option value="MANUFACTURER_NORMALIZATION">MANUFACTURER_NORMALIZATION</option>
                <option value="QUALIFICATION_VARIANT">QUALIFICATION_VARIANT</option>
                <option value="OTHER_CONTROLLED_VARIANT">OTHER_CONTROLLED_VARIANT</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Evidence *</label>
              <input required value={aliasEvidence} onChange={(e) => setAliasEvidence(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200" placeholder="Datasheet link or explanation" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer">Submit Candidate</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* User List */}
      {activeTab === 'users' && (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
          System Users
        </h3>
        {loading ? (
          <div className="text-slate-500 text-xs">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">{u.username}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.is_active ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Active</span>
                      ) : (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'aliases' && (
      <div className="space-y-6">
        {/* Candidates Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Pending Alias Candidates
          </h3>
          {candidates.length === 0 ? (
            <div className="text-slate-500 text-xs">No pending review candidates.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    <th className="pb-3 pr-4">Requested</th>
                    <th className="pb-3 pr-4">Provider / Returned</th>
                    <th className="pb-3 pr-4">Proposed Variant</th>
                    <th className="pb-3 pr-4">Evidence</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-200">{c.requested_mpn}</div>
                        <div className="text-[10px] text-slate-500">{c.requested_manufacturer}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-200 flex items-center gap-1">
                          <Link className="w-3 h-3 text-slate-400" /> {c.returned_mpn}
                        </div>
                        <div className="text-[10px] text-slate-500">{c.returned_manufacturer}</div>
                        <div className="text-[10px] text-slate-500">Provider: {c.provider}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {c.proposed_variant_type ? (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase">
                            {c.proposed_variant_type}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 max-w-xs truncate text-slate-400" title={c.evidence}>
                        {c.evidence}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleCandidateAction(c.id, 'CONVERT')} className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer" title="Convert to DRAFT">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleCandidateAction(c.id, 'REJECT')} className="text-red-400 hover:text-red-300 transition-colors cursor-pointer" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Existing Aliases Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Registered Aliases
          </h3>
        {aliases.length === 0 ? (
          <div className="text-slate-500 text-xs">No aliases found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">Requested</th>
                  <th className="pb-3 pr-4">Provider / Returned</th>
                  <th className="pb-3 pr-4">Variant Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Evidence</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {aliases.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-200">{a.requested_mpn}</div>
                      <div className="text-[10px] text-slate-500">{a.requested_manufacturer}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-1">
                        <Link className="w-3 h-3 text-slate-400" /> {a.returned_mpn}
                      </div>
                      <div className="text-[10px] text-slate-500">{a.returned_manufacturer}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                        {a.variant_type}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase ${
                        a.verification_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        a.verification_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {a.verification_status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 max-w-xs truncate text-slate-400" title={a.evidence}>
                      {a.evidence}
                    </td>
                    <td className="py-3">
                      {a.verification_status === 'DRAFT' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleVerifyAlias(a.id, 'VERIFIED')} className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer" title="Verify">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleVerifyAlias(a.id, 'REJECTED')} className="text-red-400 hover:text-red-300 transition-colors cursor-pointer" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
