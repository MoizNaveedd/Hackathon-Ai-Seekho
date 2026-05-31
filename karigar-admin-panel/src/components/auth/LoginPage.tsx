import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { UserRole, SessionUser } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (user: SessionUser) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('admin@karigar.ai');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('Super Admin');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    // Simulate authentic network latency with JWT token creation
    setTimeout(() => {
      setIsSubmitting(false);
      const simulatedJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IkFETS0wMDEiLCJuYW1lIjoiQnJhbmRvbiBNZXJyeXdlYXRoZXIiLCJlbWFpbCI6ImFkbWluQGthcmlnYXIuYWkiLCJyb2xlIjoiU3VwZXIgQWRtaW4ifQ";
      localStorage.setItem('karigar_admin_jwt', simulatedJWT);
      localStorage.setItem('karigar_admin_remember', rememberMe ? 'true' : 'false');
      
      const sessionUser: SessionUser = {
        id: "ADM-001",
        name: 'Koderspace Team',
        email: email,
        role: role,
        avatar: role === 'Super Admin' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120' : 
                role === 'Operations Admin' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' :
                role === 'Support Agent' ? 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120' :
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
      };
      
      onLoginSuccess(sessionUser);
    }, 900);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setForgotSent(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Karigar.ai"
            className="w-14 h-14 rounded-2xl object-contain shadow-xl shadow-[#0D7377]/20 animate-karigar-breathe"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          Karigar.ai Operations
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Admin Control Center for Booking & Match Orchestration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/80 rounded-2xl border border-slate-100 sm:px-10">
          {!isForgot ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div id="login-error" className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold border border-rose-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></div>
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] focus:border-transparent transition-all"
                    placeholder="name@karigar.ai"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-xs font-semibold text-[#0D7377] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#0D7377] focus:ring-[#0D7377] border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 select-none cursor-pointer">
                    Remember me for 30 days
                  </label>
                </div>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#0D7377]" /> JWT Secured
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#0D7377] hover:bg-[#0a5c5f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D7377] transition-all disabled:opacity-55 active:scale-98 shadow-md shadow-[#0D7377]/10"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Authenticating ...
                    </span>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Reset Password
              </h3>
              <p className="text-xs text-slate-500">
                Provide your registered corporate email addresses. We will send you a temporary recovery credentials link.
              </p>

              {forgotSent ? (
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-800 text-xs">
                  <p className="font-bold mb-1">Recovery Link Dispatched!</p>
                  Check security inbox for a password reset token link sent to <strong>{forgotEmail}</strong>.
                </div>
              ) : (
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Corporate Email
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] focus:border-transparent transition-all"
                      placeholder="you@karigar.ai"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!forgotSent && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#0D7377] hover:bg-[#0a5c5f] focus:outline-none focus:ring-2 focus:ring-[#0D7377] transition-all disabled:opacity-55"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Recovery Instructions'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setForgotSent(false);
                    setForgotEmail('');
                    setError('');
                  }}
                  className="w-full py-2 bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-bold rounded-lg transition-all"
                >
                  Return to Login
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-[11px] text-slate-400 font-semibold select-none flex justify-center items-center gap-1">
          <KeyRound size={11} /> Authorized Staff System. All audit logs are registered.
        </p>
      </div>
    </div>
  );
}
