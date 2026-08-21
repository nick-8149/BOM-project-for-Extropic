export function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-400">System overview, EOL risks, and component health stats.</p>
    </div>
  );
}

export function BOMUpload() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">BOM Upload</h1>
      <p className="text-slate-400">Import CSV or Excel Bill of Materials (BOM) files for parsing.</p>
    </div>
  );
}

export function PartSearch() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Part Search</h1>
      <p className="text-slate-400">Search component databases, lookup parts, compliance & alternatives.</p>
    </div>
  );
}

export function Alerts() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Alerts & PCNs</h1>
      <p className="text-slate-400">Critical obsolescence notices and manufacturer modifications notifications.</p>
    </div>
  );
}

export function Reports() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="text-slate-400">Download inventory availability, RoHS, and lifecycle spreadsheets.</p>
    </div>
  );
}

export function Admin() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Administration</h1>
      <p className="text-slate-400">Manage user groups, configure confidence thresholds, and licensing stats.</p>
    </div>
  );
}
