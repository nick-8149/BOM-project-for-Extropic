import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, FileText, Send, Loader2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  partNumber: string;
  onSuccess: () => void;
}

export function AIReviewModal({
  isOpen,
  onClose,
  candidateId,
  partNumber,
  onSuccess,
}: AIReviewModalProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'needs_testing'>('needs_testing');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/replacements/ai-review/${candidateId}`, {
        method: 'POST',
        token,
        body: { decision, comments },
      });
      showToast('Engineering review submitted successfully.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast('Failed to submit review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Engineering Review: {partNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Decision</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDecision('approved')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  decision === 'approved'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-xs font-semibold">Approve</span>
              </button>
              
              <button
                onClick={() => setDecision('needs_testing')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  decision === 'needs_testing'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs font-semibold text-center leading-tight">Needs Testing</span>
              </button>
              
              <button
                onClick={() => setDecision('rejected')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  decision === 'rejected'
                    ? 'bg-red-500/10 border-red-500 text-red-400 shadow-md shadow-red-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <XCircle className="w-5 h-5" />
                <span className="text-xs font-semibold">Reject</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Engineering Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Record validation steps, layout changes required, or reasons for rejection..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
