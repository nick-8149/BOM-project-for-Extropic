import { useState } from 'react';
import { createDraftMapping, verifyMapping, rejectMapping } from '../../api/identityClient';
import type { IdentityResolutionRecord } from '../../api/identityClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, Check } from 'lucide-react';
import LifecycleLookupStatus from './LifecycleLookupStatus';
import LifecycleStatusCard from '../Lifecycle/LifecycleStatusCard';

interface Props {
  record: IdentityResolutionRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IdentityActionDialog({ record, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedMfr, setSelectedMfr] = useState(record.manufacturers.length === 1 ? record.manufacturers[0].raw : '');
  const [mpnInput, setMpnInput] = useState(record.manufacturer_part_number || '');

  const handleSaveDraft = async () => {
    if (!token) return;
    if (!selectedMfr || !mpnInput) {
      showToast('Manufacturer and MPN are required to create a mapping.', 'error');
      return;
    }

    try {
      setLoading(true);
      await createDraftMapping(token, {
        internal_part_number: record.internal_part_number!,
        manufacturer_part_number: mpnInput,
        mapping_source: 'MANUAL_UI'
      });
      showToast('Mapping created in DRAFT status.', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token || !record.mapping_id) return;
    try {
      setLoading(true);
      await verifyMapping(token, record.mapping_id);
      showToast('Mapping is now verified and eligible for lookup.', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !record.mapping_id) return;
    try {
      setLoading(true);
      await rejectMapping(token, record.mapping_id);
      showToast('Mapping has been rejected.', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isVerified = record.verification_status === 'VERIFIED';
  const isDraft = record.verification_status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100">Review Part Identity</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Part Number (BOM)</div>
              <div className="text-lg font-mono text-slate-200 mt-1">{record.internal_part_number || 'Missing'}</div>
              <div className="text-xs mt-1 text-slate-400">Classified as: <span className="text-blue-400">{record.part_classification}</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Current Resolution</div>
              <div className={`mt-1 text-sm font-semibold uppercase ${record.resolution_status === 'RESOLVED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {record.resolution_status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-4">
             <LifecycleLookupStatus record={record} />
             {record.internal_part_number && (
               <LifecycleStatusCard internalPartNumber={record.internal_part_number} />
             )}
          </div>

          {!isVerified && !isDraft && record.resolution_status === 'AMBIGUOUS' && (
            <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-lg">
              <h3 className="text-amber-400 font-semibold mb-2">Ambiguous Manufacturer Detected</h3>
              <p className="text-sm text-amber-200/70 mb-4">Select the correct manufacturer from the detected options:</p>
              <div className="space-y-2">
                {record.manufacturers.map((m, idx) => (
                  <label key={idx} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-amber-900/20">
                    <input 
                      type="radio" 
                      name="mfr" 
                      value={m.raw} 
                      checked={selectedMfr === m.raw}
                      onChange={() => setSelectedMfr(m.raw)}
                      className="form-radio text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-200">{m.raw}</span>
                    <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-800 rounded">
                      {m.status.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isVerified && !isDraft && (record.resolution_status === 'REQUIRES_MPN_MAPPING' || record.resolution_status === 'AMBIGUOUS') && (
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Manufacturer Part Number (MPN)</label>
                  <input
                    type="text"
                    value={mpnInput}
                    onChange={(e) => setMpnInput(e.target.value)}
                    placeholder="Enter explicit MPN..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
               </div>
               <div className="flex justify-end">
                  <button 
                    onClick={handleSaveDraft}
                    disabled={loading || !mpnInput || !selectedMfr}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center font-medium"
                  >
                    Save as DRAFT Mapping
                  </button>
               </div>
            </div>
          )}

          {isDraft && (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
              <h3 className="text-slate-200 font-bold">Mapping Verification</h3>
              <p className="text-sm text-slate-400">
                You are verifying that IPN <span className="text-white font-mono">{record.internal_part_number}</span> explicitly corresponds to MPN <span className="text-white font-mono">{record.manufacturer_part_number}</span>.
              </p>
              <div className="flex justify-end space-x-3 pt-2">
                 <button 
                    onClick={handleReject}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 font-medium"
                  >
                    Reject Mapping
                  </button>
                 <button 
                    onClick={handleVerify}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 flex items-center font-medium"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Verify Mapping
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
