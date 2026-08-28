import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Download, FileSpreadsheet, Info } from 'lucide-react';

interface BOM {
  id: string;
  name: string;
  filename: string;
  total_items: number;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [selectedBomId, setSelectedBomId] = useState('');
  const [reportType, setReportType] = useState('availability');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiRequest<BOM[]>('/api/v1/bom', { token })
      .then((data) => {
        setBoms(data);
        if (data.length > 0) setSelectedBomId(data[0].id);
      })
      .catch((e) => console.error("Error loading BOMs for reports:", e));
  }, [token]);

  const handleDownload = async () => {
    if (!selectedBomId) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/reports/bom/${selectedBomId}/${reportType}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOM_${reportType}_report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to generate spreadsheet report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-500 glow-blue rounded" />
          Reports & Data Exports
        </h1>
        <p className="text-slate-400 text-sm font-medium">Select parsed BOMs, pick report categories, and download custom formatted Excel documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Form Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">
                Select BOM File
              </label>
              {boms.length === 0 ? (
                <div className="text-slate-500 text-xs italic bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-center">
                  No BOM uploads found. Upload a BOM first.
                </div>
              ) : (
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-semibold cursor-pointer"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.total_items} items)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">
                Report Format Category
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-semibold cursor-pointer"
              >
                <option value="availability">Availability & Sourcing Channel Report</option>
                <option value="lifecycle">Lifecycle & EOL Forecast Report</option>
                <option value="rohs">RoHS Directives Compliance Report</option>
                <option value="country-of-origin">Manufacturers Country of Origin Report</option>
              </select>
            </div>

            {boms.length > 0 && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Compiling Excel Report...' : 'Download Formatted Spreadsheet'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Informative Panel */}
        <div className="glass-panel rounded-2xl p-6 h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 pb-3 border-b border-slate-800/60">
            <Info className="w-4 h-4 text-slate-500" />
            Report Schemes
          </h3>
          
          <div className="space-y-4 text-xs leading-relaxed text-slate-400 font-medium">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-200">Sourcing & Availability</h4>
              <p>Highlights authorized suppliers, inventory statuses, and potential counterfeit channels.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-200">Lifecycle Forecast</h4>
              <p>Predicts time until EOL status for all active BOM items and summarizes warning flags.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-200">Compliance & RoHS</h4>
              <p>Audits substance restriction statuses and references environmental directive files.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
