import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Search, ShieldAlert, FileText, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'BOM Upload', path: '/upload', icon: UploadCloud },
    { name: 'Part Search', path: '/search', icon: Search },
    { name: 'Lifecycle Forecast', path: '/lifecycle', icon: ShieldAlert },
    { name: 'RoHS Compliance', path: '/compliance', icon: FileText },
    { name: 'Alternatives', path: '/replacements', icon: Settings },
    { name: 'Manufacturers', path: '/manufacturers', icon: Settings },
    { name: 'Suppliers', path: '/suppliers', icon: Settings },
    { name: 'Alerts', path: '/alerts', icon: ShieldAlert },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Admin', path: '/admin', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-lg">B</div>
            <div>
              <h1 className="font-semibold text-sm leading-none">BOM Verification</h1>
              <span className="text-xs text-slate-400">Obsolescence Manager</span>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t border-slate-800 pt-4">
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main page content area */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
