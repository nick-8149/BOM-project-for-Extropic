import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function BOMUploadPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      setSuccess(false);
    }
  }, []);

  const onDropRejected = useCallback(() => {
    setError('File rejected. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file under 50MB.');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.csv', '.txt'],
      'application/csv': ['.csv']
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadResult = await apiRequest<{ id: string }>('/api/v1/bom/upload', {
        method: 'POST',
        token,
        body: formData,
        contentType: '' // browser will set multipart boundary
      });
      
      // Auto-trigger matching engine on upload
      await apiRequest(`/api/v1/bom/${uploadResult.id}/process`, {
        method: 'POST',
        token
      });

      setSuccess(true);
      showToast('BOM uploaded and processed successfully!', 'success');
      setTimeout(() => {
        navigate(`/bom/${uploadResult.id}`);
      }, 1500);
    } catch (err: any) {
      const msg = err.message || 'BOM upload processing failed.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fadeIn">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <Upload className="w-8 h-8 text-blue-500 glow-blue rounded" />
          Ingest Bill of Materials
        </h1>
        <p className="text-slate-400 text-sm font-medium">Upload standard engineering CSV or Excel spreadsheets containing part numbers to audit lifecycle, EOL risks, and compliance configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Upload interaction */}
        <div className="md:col-span-2 space-y-6">
          {/* Drag & Drop Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-350 ${
              isDragActive 
                ? 'border-blue-500 bg-blue-600/5 glow-blue' 
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700/80 hover:bg-slate-900/60'
            }`}
          >
            <input {...getInputProps()} />
            <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/50 transition-transform group-hover:scale-105">
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            {isDragActive ? (
              <p className="text-sm text-blue-400 font-bold tracking-wide">Drop the BOM file here...</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">Drag & drop your BOM file here, or <span className="text-blue-500 hover:text-blue-400 transition-colors">browse files</span></p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Supports Excel (.xlsx, .xls) and CSV (.csv) up to 50MB</p>
              </div>
            )}
          </div>

          {/* Selected File Details */}
          {file && (
            <div className="glass-panel border-slate-800/80 rounded-xl p-5 flex items-center justify-between animate-slideUp">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/15">
                  <File className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">{file.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-red-500/5"
                disabled={loading}
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex items-start gap-3 animate-slideUp">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Processing Error</p>
                <p className="text-slate-400 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-4 flex items-center gap-3 animate-slideUp">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Verification In Progress</p>
                <p className="text-slate-400 leading-relaxed">BOM items validated. Redirecting to matching logs...</p>
              </div>
            </div>
          )}

          {file && !success && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Processing Catalog Matching...' : 'Upload & Process BOM'}
            </button>
          )}
        </div>

        {/* Right column: Instruction list */}
        <div className="glass-panel rounded-2xl p-6 h-fit space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800/80 pb-3">
            Processing Guidelines
          </h3>
          <ul className="space-y-4 text-xs text-slate-400 font-medium">
            <li className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              <span>Make sure columns contain a **Part Number** or **MPN** header block.</span>
            </li>
            <li className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              <span>Multi-row header blocks are dynamically parsed and title rows are skipped automatically.</span>
            </li>
            <li className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              <span>Multiple manufacturers associated with parts are supported and scanned against normalized catalog definitions.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
