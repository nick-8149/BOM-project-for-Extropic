import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Download } from 'lucide-react';

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
      });
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
    <div className="space-y-6 max-w-xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Reports & Data Exports</h1>
        <p className="text-slate-400 text-sm">Select parsed BOMs, pick report categories, and download custom formatted Excel documents.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Select BOM File
          </label>
          {boms.length === 0 ? (
            <div className="text-slate-500 text-xs italic">No BOM uploads found. Upload a BOM first.</div>
          ) : (
            <select
              value={selectedBomId}
              onChange={(e) => setSelectedBomId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {downloading ? (
              'Generating Spreadsheet...'
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Excel Document (.xlsx)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
