import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldAlert, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validation / animation flags
  const [usernameInvalid, setUsernameInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Inline field validation
    let hasError = false;
    if (!username.trim()) {
      setUsernameInvalid(true);
      hasError = true;
    } else {
      setUsernameInvalid(false);
    }
    
    if (!password.trim()) {
      setPasswordInvalid(true);
      hasError = true;
    } else {
      setPasswordInvalid(false);
    }

    if (hasError) {
      setShakeKey((prev) => prev + 1);
      showToast('Please enter both username and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      showToast('Welcome back! Login successful.', 'success');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setShakeKey((prev) => prev + 1);
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 -z-10 pointer-events-none" />

      {/* Floating Card Container */}
      <div 
        key={shakeKey}
        className={`w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 shadow-2xl relative border border-slate-800/80 animate-fadeInScale ${
          shakeKey > 0 ? 'animate-shake' : ''
        }`}
      >
        
        {/* Logo and Headings */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-2xl text-white mx-auto mb-4 shadow-xl shadow-blue-500/25 animate-pulse">
            B
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white leading-tight">
            BOM Verification Hub
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium tracking-wide">
            Enterprise Component Obsolescence Manager
          </p>
        </div>

        {/* Error Alert Block */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex items-start gap-3 mb-6 animate-slideUp">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Authentication Failed</p>
              <p className="text-slate-400 font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Username Input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (e.target.value.trim()) setUsernameInvalid(false);
                }}
                className={`w-full bg-slate-950/80 border rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder:text-slate-700 font-semibold ${
                  usernameInvalid 
                    ? 'border-red-500 focus:border-red-500/80' 
                    : 'border-slate-850 hover:border-slate-700 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                }`}
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (e.target.value.trim()) setPasswordInvalid(false);
                }}
                className={`w-full bg-slate-950/80 border rounded-xl py-3 pl-11 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder:text-slate-700 font-semibold ${
                  passwordInvalid 
                    ? 'border-red-500 focus:border-red-500/80' 
                    : 'border-slate-850 hover:border-slate-700 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                }`}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password Row */}
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-400 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-blue-600"
              />
              <span>Remember me</span>
            </label>
            <a 
              href="#forgot" 
              onClick={(e) => {
                e.preventDefault();
                showToast('Please contact your administrator to reset your password.', 'info');
              }}
              className="text-blue-500 hover:text-blue-400 hover:underline transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] active:opacity-90 disabled:opacity-50 mt-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Footer Info Note */}
      <p className="text-[11px] font-semibold text-slate-500 mt-6 text-center">
        Forgot your login? <a href="#admin" onClick={(e) => { e.preventDefault(); showToast('Contact support: admin@company.com', 'info'); }} className="text-blue-500 hover:text-blue-400 transition-colors">Contact admin</a>
      </p>
    </div>
  );
}
