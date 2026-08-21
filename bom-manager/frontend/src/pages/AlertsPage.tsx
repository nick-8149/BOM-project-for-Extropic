import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bell, Plus, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PCN {
  id: string;
  part_id: string;
  pcn_number: string;
  change_type: string;
  description: string;
  effective_date: string;
  status: string;
  document_link: string | null;
  created_at: string;
}

interface Part {
  id: string;
  part_number: string;
}

export default function AlertsPage() {
  const { token } = useAuth();
  const [pcns, setPcns] = useState<PCN[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [partId, setPartId] = useState('');
  const [pcnNumber, setPcnNumber] = useState('');
  const [changeType, setChangeType] = useState('End of Life');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [docLink, setDocLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<PCN[]>('/api/v1/pcn/pcn', { token }),
      apiRequest<Part[]>('/api/v1/parts', { token })
    ])
      .then(([pcnData, partsData]) => {
        setPcns(pcnData);
        setParts(partsData);
        if (partsData.length > 0) setPartId(partsData[0].id);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const newPcn = await apiRequest<PCN>('/api/v1/pcn/pcn', {
        method: 'POST',
        token,
        body: {
          part_id: partId,
          pcn_number: pcnNumber,
          change_type: changeType,
          description,
          effective_date: effectiveDate,
          document_link: docLink || null
        }
      });
      setPcns((prev) => [newPcn, ...prev]);
      setPcnNumber('');
      setDescription('');
      setEffectiveDate('');
      setDocLink('');
      setShowForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create PCN');
    } finally {
      setAdding(false);
    }
  };

  const getChangeTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('end of life') || t.includes('eol')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (t.includes('material')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (t.includes('site')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            PCN Alerts & Change Notifications
          </h1>
          <p className="text-slate-400 text-sm">Track Product Change Notices, EOL announcements, and material change advisories.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New PCN
        </button>
      </div>

      {/* Create PCN Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
            Register New PCN
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Affected Part *</label>
              <select
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.part_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">PCN Number *</label>
              <input
                type="text"
                required
                value={pcnNumber}
                onChange={(e) => setPcnNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="PCN-2026-001"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Change Type *</label>
              <select
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="End of Life">End of Life (EOL)</option>
                <option value="Materials Change">Materials Change</option>
                <option value="Manufacturing Site Change">Manufacturing Site Change</option>
                <option value="Specification Change">Specification Change</option>
                <option value="Packaging Change">Packaging Change</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Effective Date *</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Brief summary of the change impact..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Document Link (optional)</label>
              <input
                type="url"
                value={docLink}
                onChange={(e) => setDocLink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="https://manufacturer.com/pcn/PCN-2026-001.pdf"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-6 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {adding ? 'Publishing...' : 'Publish PCN'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PCN Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
          Change Notice Log ({pcns.length})
        </h3>

        {loading ? (
          <div className="text-slate-500 text-xs">Loading PCN records...</div>
        ) : pcns.length === 0 ? (
          <div className="text-slate-500 text-xs italic text-center py-8">
            No Product Change Notices have been filed yet. Click "New PCN" to register one.
          </div>
        ) : (
          <div className="space-y-4">
            {pcns.map((pcn) => {
              const partMatch = parts.find((p) => p.id === pcn.part_id);
              return (
                <div key={pcn.id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-200">{pcn.pcn_number}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getChangeTypeColor(pcn.change_type)}`}>
                        {pcn.change_type}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded uppercase">
                        {pcn.status}
                      </span>
                    </div>
                    {pcn.description && (
                      <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{pcn.description}</p>
                    )}
                    <div className="flex gap-x-4 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Part: {partMatch ? (
                          <Link to={`/parts/${partMatch.id}`} className="text-blue-500 hover:underline">{partMatch.part_number}</Link>
                        ) : pcn.part_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Effective: {new Date(pcn.effective_date).toLocaleDateString()}
                      </span>
                      <span>Filed: {new Date(pcn.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {pcn.document_link && (
                    <a
                      href={pcn.document_link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Document
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
