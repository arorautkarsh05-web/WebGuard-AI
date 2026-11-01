import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, User, Building, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isRegister) {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          email,
          password,
          confirm_password: confirmPassword,
          full_name: fullName,
          organization_name: orgName || undefined,
        });
        const { access_token, user } = res.data;
        onAuthSuccess(access_token, user);
      } else {
        const res = await api.post('/auth/login', {
          email,
          password,
        });
        const { access_token, user } = res.data;
        onAuthSuccess(access_token, user);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@webguard.ai');
    setPassword('WebGuardPass2026!');
    setIsRegister(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Subtle Electric Cyan & Royal Amethyst background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8B5CF6]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-[#00E5FF]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0B0B0F] border border-[#8B5CF6]/20 rounded-2xl p-8 relative shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center mb-3.5 shadow-lg shadow-[#8B5CF6]/10">
            <ShieldCheck className="w-6 h-6 text-[#00E5FF]" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            WebGuard <span className="text-[#00E5FF]">AI</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            {isRegister
              ? 'Create your enterprise cybersecurity & monitoring account'
              : 'Autonomous Web Intelligence & Security Platform'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/30 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Security Engineer"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Organization Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-white/30 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Cybersecurity"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Corporate Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/30 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@enterprise.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8B5CF6] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/30 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8B5CF6] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-white/40 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/30 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8B5CF6] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-white/40 hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && confirmPassword && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {password === confirmPassword ? (
                    <span className="text-[#00E5FF] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-red-400">Passwords do not match</span>
                  )}
                </div>
              )}
            </div>
          )}

          {!isRegister && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-white/80 transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#0B0B0F] border-white/20 text-[#8B5CF6] focus:ring-0 focus:ring-offset-0"
                />
                <span>Remember session</span>
              </label>
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="text-[11px] text-[#00E5FF] hover:underline"
              >
                Use Demo Admin
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Complete Registration' : 'Authenticate & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-white/60">
          {isRegister ? (
            <div>
              Already have an enterprise account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage(null);
                }}
                className="text-[#00E5FF] font-semibold hover:underline"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              Need access for your organization?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage(null);
                }}
                className="text-[#00E5FF] font-semibold hover:underline"
              >
                Register Organization
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
