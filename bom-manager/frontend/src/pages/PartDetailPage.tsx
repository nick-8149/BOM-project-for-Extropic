import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Cpu, Globe, Award, CheckCircle2, AlertTriangle, Calendar, ExternalLink, Mail, MapPin } from 'lucide-react';
import LifecycleBadge from '../components/LifecycleBadge';
import RoHSBadge from '../components/RoHSBadge';

interface Manufacturer {
  name: string;
  code: string;
  country_of_origin: string;
  website: string;
}

interface PartManufacturer {
  id: string;
  manufacturer: Manufacturer;
  manufacturer_part_number: string;
  is_primary: boolean;
}

interface Supplier {
  name: string;
  code: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  is_authorized: boolean;
}

interface PartSupplier {
  id: string;
  supplier: Supplier;
  supplier_part_number: string;
  is_approved: boolean;
}

interface LifecycleInfo {
  lifecycle_status: string;
  eol_date: string | null;
  years_to_eol: number | null;
  last_verified: string;
  source: string;
}

interface ComplianceInfo {
  rohs_status: string;
  rohs_directive_ref: string | null;
  certificate_link: string | null;
}

interface PartDetail {
  id: string;
  part_number: string;
  description: string;
  category: string;
  package_type: string;
  standard_cert: string;
  notes: string;
  created_at: string;
  updated_at: string;
  manufacturers: PartManufacturer[];
  suppliers: PartSupplier[];
  lifecycle_info: LifecycleInfo | null;
  compliance_info: ComplianceInfo | null;
}

export default function PartDetailPage() {
  const { partId } = useParams<{ partId: string }>();
  const { token } = useAuth();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!partId) return;
    setLoading(true);
    apiRequest<PartDetail>(`/api/v1/parts/${partId}`, { token })
      .then(setPart)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partId, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 shimmer-bg rounded" />
        <div className="glass-panel rounded-2xl h-48 shimmer-bg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl h-96 shimmer-bg" />
          <div className="glass-panel rounded-2xl h-96 shimmer-bg" />
        </div>
      </div>
    );
  }

  if (error) return <div className="text-red-400 text-sm font-bold">Error loading component details: {error}</div>;
  if (!part) return <div className="text-slate-500 text-sm font-semibold">Catalog record not found.</div>;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Navigation & Back Action */}
      <Link to="/search" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Catalog
      </Link>

      {/* Hero Header Card */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-600/5 to-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500 glow-blue rounded" />
              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/10 px-2.5 py-0.5 rounded-full text-blue-400">
                {part.category || 'Component'}
              </span>
              {part.standard_cert && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-950/80 border border-slate-850 px-2.5 py-0.5 rounded-full text-slate-400">
                  {part.standard_cert}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight">{part.part_number}</h1>
            <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">{part.description || 'No datasheet description populated in local catalog parameters.'}</p>
          </div>

          <div className="flex flex-wrap gap-2.5 md:self-start shrink-0">
            {part.lifecycle_info && <LifecycleBadge status={part.lifecycle_info.lifecycle_status} />}
            {part.compliance_info && <RoHSBadge status={part.compliance_info.rohs_status} />}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Technical Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tech Specs */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 border-b border-slate-800/80 pb-3">
              Technical Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8 text-xs">
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Part Number (MPN)</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{part.part_number}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Classification Category</span>
                <span className="text-sm font-bold text-slate-200">{part.category || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Package / Form Factor</span>
                <span className="text-sm font-bold text-slate-200">{part.package_type || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Standard / Certification</span>
                <span className="text-sm font-bold text-slate-200">{part.standard_cert || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Compliance Status</span>
                <span className="text-sm font-bold text-slate-200">{part.compliance_info?.rohs_status || 'Unknown'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lifecycle Status</span>
                <span className="text-sm font-bold text-slate-200">{part.lifecycle_info?.lifecycle_status || 'Unknown'}</span>
              </div>
            </div>
            
            {part.notes && (
              <div className="mt-6 pt-5 border-t border-slate-850">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Notes / Internal Remarks</span>
                <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-950/40 p-3 rounded-lg border border-slate-900">{part.notes}</p>
              </div>
            )}
          </div>

          {/* Manufacturers */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 border-b border-slate-800/80 pb-3">
              Manufacturers & MPNs
            </h3>
            
            <div className="space-y-4">
              {part.manufacturers.map((pm) => (
                <div key={pm.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/40 border border-slate-905 rounded-xl gap-4 hover:border-slate-800 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm text-slate-200">{pm.manufacturer.name}</span>
                      {pm.is_primary && (
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Primary
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-slate-500" /> Code: {pm.manufacturer.code || '—'}</span>
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-slate-500" /> Origin: {pm.manufacturer.country_of_origin || '—'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="sm:text-right">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Manufacturer MPN</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{pm.manufacturer_part_number}</span>
                    </div>
                    {pm.manufacturer.website && (
                      <a
                        href={pm.manufacturer.website}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Compliance, Proximity, EOL, Suppliers */}
        <div className="space-y-6">
          {/* EOL Forecast */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 border-b border-slate-800/80 pb-3">
              Life Cycle Forecast
            </h3>
            
            {part.lifecycle_info ? (
              <div className="space-y-4 text-xs font-medium text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated Years to EOL</span>
                  <span className="text-base font-extrabold text-white">
                    {part.lifecycle_info.years_to_eol !== null 
                      ? `${part.lifecycle_info.years_to_eol} Yrs` 
                      : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">EOL Forecast Date</span>
                  <span className="font-bold text-slate-200">
                    {part.lifecycle_info.eol_date 
                      ? new Date(part.lifecycle_info.eol_date).toLocaleDateString() 
                      : 'N/A'}
                  </span>
                </div>
                
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-3 border-t border-slate-850">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Verified via {part.lifecycle_info.source}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic text-center py-4">No lifecycle logs linked to this part.</div>
            )}
          </div>

          {/* Suppliers list */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 border-b border-slate-800/80 pb-3">
              Supplier Channels
            </h3>
            
            {part.suppliers.length === 0 ? (
              <div className="text-xs text-slate-500 italic text-center py-4">No suppliers linked to this component.</div>
            ) : (
              <div className="space-y-4">
                {part.suppliers.map((ps) => (
                  <div key={ps.id} className="p-4 bg-slate-950/40 border border-slate-905 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-200">{ps.supplier.name}</span>
                      {ps.supplier.is_authorized ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Authorized
                        </span>
                      ) : (
                        <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 animate-pulse" /> Unauthorized
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[10px]">Supplier PN:</span>
                      <span className="font-mono text-slate-300 font-semibold">{ps.supplier_part_number}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] text-slate-500 pt-2 border-t border-slate-900 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {ps.supplier.location || 'N/A'}</span>
                      {ps.supplier.contact_email && (
                        <a href={`mailto:${ps.supplier.contact_email}`} className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors">
                          <Mail className="w-3.5 h-3.5" /> Contact
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
