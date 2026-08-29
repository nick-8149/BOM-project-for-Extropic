import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AIComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  original: Record<string, any>;
  candidate: Record<string, any>;
  compatibility: Record<string, any>;
}

export function AIComparisonModal({
  isOpen,
  onClose,
  original,
  candidate,
  compatibility,
}: AIComparisonModalProps) {
  if (!isOpen) return null;

  // The AI service ensures missing data is returned as "unknown"
  // and we only display fields that exist in the database model.
  const fields = [
    { key: 'part_number', label: 'Part Number', dim: null },
    { key: 'category', label: 'Category', dim: 'category' },
    { key: 'package_type', label: 'Package Type', dim: 'package' },
    { key: 'standard_cert', label: 'Standard/Cert', dim: null },
    { key: 'lifecycle_status', label: 'Lifecycle', dim: 'lifecycle' },
    { key: 'rohs_status', label: 'RoHS Status', dim: 'compliance' },
  ];

  const renderStatus = (status?: string) => {
    switch (status) {
      case 'match':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'partial_match':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'incompatible':
        return <X className="w-4 h-4 text-red-400" />;
      case 'unknown':
      default:
        return <span className="text-slate-500">—</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Component Comparison
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-800">
            <div className="col-span-3">Specification</div>
            <div className="col-span-4 text-blue-400">Original</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-4 text-indigo-400">Candidate</div>
          </div>

          <div className="space-y-1">
            {fields.map((f) => {
              const compStatus = f.dim ? compatibility[f.dim]?.status : null;
              const compExp = f.dim ? compatibility[f.dim]?.explanation : '';

              return (
                <div key={f.key} className="grid grid-cols-12 gap-4 text-sm py-3 px-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
                  <div className="col-span-3 font-semibold text-slate-400">{f.label}</div>
                  
                  <div className="col-span-4 font-mono text-slate-300 break-words">
                    {original[f.key] || <span className="text-slate-600 italic">Unknown</span>}
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-center" title={compExp}>
                    {renderStatus(compStatus)}
                  </div>
                  
                  <div className="col-span-4 font-mono text-slate-300 break-words">
                    {candidate[f.key] || <span className="text-slate-600 italic">Unknown</span>}
                  </div>
                </div>
              );
            })}
            
            {/* Suppliers logic specifically since it's an array */}
            <div className="grid grid-cols-12 gap-4 text-sm py-3 px-2 rounded-lg hover:bg-slate-800/50 transition-colors">
              <div className="col-span-3 font-semibold text-slate-400">Suppliers</div>
              <div className="col-span-4 font-mono text-slate-300">
                {original.suppliers?.length 
                  ? original.suppliers.map((s: any) => s.name).join(', ') 
                  : <span className="text-slate-600 italic">Unknown</span>}
              </div>
              <div className="col-span-1 flex items-center justify-center" title={compatibility['supplier_availability']?.explanation}>
                {renderStatus(compatibility['supplier_availability']?.status)}
              </div>
              <div className="col-span-4 font-mono text-slate-300">
                {candidate.suppliers?.length 
                  ? candidate.suppliers.map((s: any) => s.name).join(', ') 
                  : <span className="text-slate-600 italic">Unknown</span>}
              </div>
            </div>
            
          </div>
          
          <div className="mt-8 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Note on Specifications</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The AI engine is restricted to analyzing only data that explicitly exists in the database. 
              Because specifications such as voltage, current, and exact footprint dimensions are not 
              stored in the current schema, they are treated as "Unknown" and must be verified manually 
              via datasheet inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
