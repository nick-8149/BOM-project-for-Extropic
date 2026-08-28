import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Search, 
  ShieldAlert, 
  FileText, 
  Settings, 
  LogOut, 
  Building2, 
  Truck, 
  BellRing, 
  FileSpreadsheet,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut as LogOutIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { showToast } = useToast();

  // Sidebar collapsible state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Sign out confirmation modal state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const sections = [
    {
      title: 'Operations',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'BOM Ingestion', path: '/upload', icon: UploadCloud },
        { name: 'Sourcing Reports', path: '/reports', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'Lifecycle & Compliance',
      items: [
        { name: 'Part Catalog Search', path: '/search', icon: Search },
        { name: 'EOL Forecasts', path: '/lifecycle', icon: ShieldAlert },
        { name: 'RoHS Compliance', path: '/compliance', icon: FileText },
        { name: 'Alternatives Suggestion', path: '/replacements', icon: Settings },
      ]
    },
    {
      title: 'Directories & PCN',
      items: [
        { name: 'Manufacturers', path: '/manufacturers', icon: Building2 },
        { name: 'Suppliers', path: '/suppliers', icon: Truck },
        { name: 'PCN Alerts', path: '/alerts', icon: BellRing },
      ]
    }
  ];

  const showAdmin = user?.role === 'admin';

  const handleConfirmSignOut = () => {
    setShowSignOutConfirm(false);
    logout();
    showToast('You have successfully signed out.', 'success');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar navigation */}
      <aside 
        className={`bg-slate-900/60 border-r border-slate-800/80 flex flex-col justify-between p-4 backdrop-blur-md shrink-0 transition-all duration-350 ease-in-out relative ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all cursor-pointer z-20"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div>
          {/* Top Logo */}
          <div className={`flex items-center gap-3 px-3 py-4 mb-6 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/15 rounded-xl ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-blue-500/25 shrink-0">
              B
            </div>
            {!isCollapsed && (
              <div className="animate-fadeIn">
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">BOM Verify</h1>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Obsolescence Hub</span>
              </div>
            )}
          </div>

          {/* Navigation Groups */}
          <div className="space-y-6">
            {sections.map((sec) => (
              <div key={sec.title} className="space-y-2">
                {!isCollapsed ? (
                  <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-fadeIn">
                    {sec.title}
                  </h3>
                ) : (
                  <div className="border-t border-slate-850 my-2" />
                )}
                <nav className="space-y-1">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 relative group cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        {/* Left border active accent */}
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r" />
                        )}
                        <Icon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="animate-fadeIn">{item.name}</span>}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* Admin Section */}
            {showAdmin && (
              <div className="space-y-2">
                {!isCollapsed ? (
                  <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-fadeIn">
                    System Settings
                  </h3>
                ) : (
                  <div className="border-t border-slate-850 my-2" />
                )}
                <nav className="space-y-1">
                  <Link
                    to="/admin"
                    title={isCollapsed ? 'Admin Settings' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 relative group cursor-pointer ${
                      location.pathname === '/admin'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    {location.pathname === '/admin' && !isCollapsed && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r" />
                    )}
                    <UserCheck className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="animate-fadeIn">Admin Settings</span>}
                  </Link>
                </nav>
              </div>
            )}
          </div>
        </div>
        
        {/* Profile Card & Sign Out */}
        <div className="border-t border-slate-800/60 pt-4 space-y-3">
          {user && !isCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/50 flex items-center gap-3 animate-fadeIn">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400 uppercase shrink-0">
                {user.username.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => setShowSignOutConfirm(true)}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main page content area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-slate-800/80 rounded-2xl p-6 max-w-sm w-full animate-fadeInScale space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <LogOutIcon className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-white">Confirm Sign Out</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to end your session? You will need to re-authenticate to access the BOM Obsolescence Manager system.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="bg-slate-905 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-md shadow-red-500/10"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
