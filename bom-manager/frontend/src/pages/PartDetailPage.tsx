import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Cpu, Globe, Award, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
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

  if (loading) return <div className="text-slate-400 text-sm">Loading component metadata...</div>;
  if (error) return <div className="text-red-400 text-sm">Error: {error}</div>;
  if (!part) return <div className="text-slate-400 text-sm">Part not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      {/* Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded text-blue-400">
                {part.category || 'Component'}
              </span>
              {part.standard_cert && (
                <span className="text-xs font-semibold uppercase tracking-wider bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                  {part.standard_cert}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-100">{part.part_number}</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">{part.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 md:self-start">
            {part.lifecycle_info && <LifecycleBadge status={part.lifecycle_info.lifecycle_status} />}
            {part.compliance_info && <RoHSBadge status={part.compliance_info.rohs_status} />}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: 12 Specifications Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              Technical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-slate-500">Manufacturer Part Number (MPN)</span>
                <span className="text-sm font-semibold text-slate-200">{part.part_number}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Category</span>
                <span className="text-sm font-semibold text-slate-200">{part.category || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Package / Form Factor</span>
                <span className="text-sm font-semibold text-slate-200">{part.package_type || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Standard / Certification</span>
                <span className="text-sm font-semibold text-slate-200">{part.standard_cert || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">Lifecycle Status</span>
                <span className="text-sm font-semibold text-slate-200">{part.lifecycle_info?.lifecycle_status || 'Unknown'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">RoHS Compliance Status</span>
                <span className="text-sm font-semibold text-slate-200">{part.compliance_info?.rohs_status || 'Unknown'}</span>
              </div>
            </div>
            {part.notes && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="block text-xs text-slate-500 mb-1">Notes / Remarks</span>
                <p className="text-xs text-slate-400 leading-relaxed">{part.notes}</p>
              </div>
            )}
          </div>

          {/* Manufacturers & Alternates */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              Manufacturers & Associated MPNs
            </h3>
            <div className="space-y-4">
              {part.manufacturers.map((pm) => (
                <div key={pm.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-200">{pm.manufacturer.name}</span>
                      {pm.is_primary && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.25 rounded font-semibold uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Code: {pm.manufacturer.code || 'N/A'}</span>
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Origin: {pm.manufacturer.country_of_origin || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Manufacturer MPN</span>
                      <span className="text-sm font-mono font-semibold text-blue-400">{pm.manufacturer_part_number}</span>
                    </div>
                    {pm.manufacturer.website && (
                      <a
                        href={pm.manufacturer.website}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: EOL Estimation, Compliance & Suppliers */}
        <div className="space-y-6">
          
          {/* EOL Forecast Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              Life Cycle Forecast
            </h3>
            {part.lifecycle_info ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Estimated Years to EOL</span>
                  <span className="text-lg font-bold text-slate-200">
                    {part.lifecycle_info.years_to_eol !== null 
                      ? `${part.lifecycle_info.years_to_eol} Yrs` 
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">EOL Forecast Date</span>
                  <span className="text-sm font-semibold text-slate-300">
                    {part.lifecycle_info.eol_date 
                      ? new Date(part.lifecycle_info.eol_date).toLocaleDateString() 
                      : 'N/A'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Verified: {new Date(part.lifecycle_info.last_verified).toLocaleDateString()} via {part.lifecycle_info.source}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No lifecycle data found.</div>
            )}
          </div>

          {/* Supplier Inventory & Authorization */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
              Supplier Channels
            </h3>
            {part.suppliers.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No suppliers listed for this component.</div>
            ) : (
              <div className="space-y-4">
                {part.suppliers.map((ps) => (
                  <div key={ps.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">{ps.supplier.name}</span>
                      {ps.supplier.is_authorized ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.25 rounded font-semibold uppercase flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Authorized
                        </span>
                      ) : (
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.25 rounded font-semibold uppercase flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Unauthorized
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Supplier PN:</span>
                      <span className="font-mono text-slate-300">{ps.supplier_part_number}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>Loc: {ps.supplier.location || 'N/A'}</span>
                      {ps.supplier.contact_email && (
                        <a href={`mailto:${ps.supplier.contact_email}`} className="text-blue-500 hover:underline">
                          Contact
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
