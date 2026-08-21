import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BOMUploadPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
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
      setTimeout(() => {
        navigate(`/bom/${uploadResult.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'BOM upload processing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Upload Bill of Materials (BOM)</h1>
        <p className="text-slate-400 text-sm">Upload standard engineering CSV or Excel spreadsheets containing manufacturer part numbers to scan for lifecycle issues and compliance certificates.</p>
      </div>

      {/* Drag & Drop Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragActive 
            ? 'border-blue-500 bg-blue-500/5' 
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-sm text-blue-400 font-semibold">Drop the BOM file here...</p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-slate-300">Drag & drop your BOM file, or <span className="text-blue-500 font-semibold">browse files</span></p>
            <p className="text-xs text-slate-500">Supports Excel (.xlsx, .xls) and CSV (.csv) formats up to 50MB</p>
          </div>
        )}
      </div>

      {/* Selected File Details */}
      {file && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded text-blue-500">
              <File className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-xs text-slate-500 hover:text-slate-300 hover:underline"
            disabled={loading}
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>BOM uploaded successfully! Redirecting to results...</span>
        </div>
      )}

      {file && !success && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/10"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Processing BOM File...' : 'Upload & Process BOM'}
        </button>
      )}
    </div>
  );
}
