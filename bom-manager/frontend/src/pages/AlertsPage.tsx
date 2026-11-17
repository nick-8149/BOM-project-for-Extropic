import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bell, AlertTriangle, ShieldAlert, AlertCircle, Info, CheckCircle2, Bot, BrainCircuit, X, Search, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  part_id: string | null;
  bom_id: string | null;
  pcn_id: string | null;
  risk_score: number | null;
  status: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

export default function AlertsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'RESOLVED' | 'ALL'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/alerts/?limit=100';
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (severityFilter !== 'ALL') {
        url += `&severity=${severityFilter}`;
      }
      const data = await apiRequest<Alert[]>(url, { token });
      setAlerts(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runEngine = async () => {
    setRunning(true);
    try {
      await apiRequest('/api/v1/alerts/run', { method: 'POST', token });
      await fetchAlerts();
      // Force trigger an unread count update if we had a global state for it
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (err: any) {
      alert("Failed to run engine: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleAction = async (id: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      await apiRequest(`/api/v1/alerts/${id}/${action}`, { method: 'POST', token });
      // Remove or update locally
      if (statusFilter === 'ACTIVE' && (action === 'resolve' || action === 'dismiss')) {
        setAlerts(alerts.filter(a => a.id !== id));
      } else {
        setAlerts(alerts.map(a => a.id === id ? { ...a, status: action.toUpperCase() } : a));
      }
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'HIGH': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'WARNING': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'WARNING': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getCardBorder = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
      case 'HIGH': return 'border-orange-500/30';
      case 'WARNING': return 'border-amber-500/30';
      default: return 'border-slate-800';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-500" />
            Intelligent Alerts Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Data-driven component and BOM risks detected by the alert engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runEngine}
            disabled={running}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-700"
          >
            <BrainCircuit className={`w-4 h-4 ${running ? 'animate-pulse text-blue-400' : 'text-blue-500'}`} />
            {running ? 'Evaluating Rules...' : 'Run Alert Engine'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-wrap gap-2">
        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'ACTIVE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Active & Unread
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'RESOLVED' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Alerts
          </button>
        </div>

        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 ml-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'WARNING'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${severityFilter === sev ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading intelligent alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Alerts</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Your BOMs and components are currently in good health based on the selected filters.
            </p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`bg-slate-900 border rounded-xl p-5 flex flex-col md:flex-row gap-5 transition-all hover:bg-slate-800/50 relative overflow-hidden ${getCardBorder(alert.severity)} ${alert.is_read ? 'opacity-80' : ''}`}>
              {!alert.is_read && (
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              )}
              
              {/* Icon & Severity */}
              <div className="shrink-0 pt-1">
                {getSeverityIcon(alert.severity)}
              </div>

              {/* Content */}
              <div className="flex-grow space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {alert.alert_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                  {alert.message}
                </p>

                {/* Badges for context */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {alert.part_id && (
                    <Link to={`/parts/${alert.part_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 hover:text-blue-400 hover:border-blue-500/30 transition-colors">
                      <Search className="w-3 h-3 text-slate-500" />
                      View Component Profile
                    </Link>
                  )}
                  {alert.risk_score && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                      Risk Score: <strong className={alert.risk_score >= 90 ? 'text-red-400' : 'text-orange-400'}>{alert.risk_score}</strong>
                    </span>
                  )}
                  {alert.pcn_id && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                      <FileText className="w-3 h-3 text-slate-500" />
                      PCN Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex flex-row md:flex-col gap-2 justify-start border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-5">
                {(alert.alert_type.includes('EOL') || alert.alert_type === 'HIGH_RISK' || alert.alert_type === 'REPLACEMENT_AVAILABLE') && alert.part_id && (
                  <button
                    onClick={() => navigate(`/replacements?part_id=${alert.part_id}`)}
                    className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Analyze with AI
                  </button>
                )}
                
                {alert.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleAction(alert.id, 'acknowledge')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
                
                {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                  <button
                    onClick={() => handleAction(alert.id, 'resolve')}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                )}
                
                {alert.status !== 'DISMISSED' && (
                  <button
                    onClick={() => handleAction(alert.id, 'dismiss')}
                    className="w-full text-slate-500 hover:text-slate-300 text-[10px] font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
