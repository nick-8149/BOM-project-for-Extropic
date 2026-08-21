import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Settings, Users, Database, Shield, Plus } from 'lucide-react';

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

  useEffect(() => {
    // For now, show the current user info (future: admin list users endpoint)
    if (currentUser) {
      setUsers([currentUser as unknown as User]);
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
          Register User
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

      {/* User List */}
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
    </div>
  );
}
