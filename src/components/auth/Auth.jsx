import React, { useState, useEffect } from 'react';
import vobiLogoLight from '../../assets/vobi-logo.png';
import Toast from '../ui/Toast';
import { validateName, validateOrganization } from '../../utils/validation';
import { supabase } from '../../utils/supabase';
import { checkHealth } from '../../utils/api';
import { IconGoogle, IconAuthCheck, IconEnvelope, IconLock, IconUser, IconBuilding } from '../ui/icons';

export default function Auth({ initialBackendStatus, onBackendChange }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(initialBackendStatus ?? false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToastMsg = (type, message) => {
    setToast({ show: false, type, message: '' });
    setTimeout(() => setToast({ show: true, type, message }), 10);
  };

  useEffect(() => {
    let mounted = true;
    let failureCount = 0;

    const verifyBackend = async () => {
      const res = await checkHealth();
      if (mounted) {
        if (res) {
          failureCount = 0;
          setIsBackendOnline(true);
          onBackendChange?.(true);
        } else {
          failureCount++;
          if (failureCount >= 3) {
            setIsBackendOnline(false);
            onBackendChange?.(false);
          }
        }
      }
    };
    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const newErrors = {};
    if (isSignUp) {
      if (fullName) {
        if (fullName.length < 2) newErrors.fullName = 'Must be at least 2 characters';
        else if (fullName.length > 50) newErrors.fullName = 'Cannot exceed 50 characters';
        else if (!validateName(fullName)) {
          newErrors.fullName = 'Letters and single spaces only';
        }
      }
      if (organization) {
        if (organization.length < 2) newErrors.organization = 'Must be at least 2 characters';
        else if (organization.length > 100) newErrors.organization = 'Cannot exceed 100 characters';
        else if (!validateOrganization(organization)) {
          newErrors.organization = 'No special symbols or trailing spaces';
        }
      }
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (password && password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }

    setErrors(newErrors);
  }, [fullName, organization, email, password, isSignUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) return;

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              organization: organization,
            }
          }
        });
        if (error) {
          throw new Error(error.message.includes('Database error') ? 'Server Error. Please try again later.' : error.message);
        }
        
        if (!data.session) {
          showToastMsg('success', 'Account created! Please check your email.');
          setIsSignUp(false);
          setFullName('');
          setOrganization('');
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        showToastMsg('error', 'Network error. Please check your connection.');
      } else {
        showToastMsg('error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err) {
      showToastMsg('error', err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || errors.email) {
      showToastMsg('error', 'Please enter a valid email address first.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      showToastMsg('success', 'Password reset instructions sent to your email.');
    } catch (err) {
      showToastMsg('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white animate-fade-in relative">
      {toast.show && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast({ show: false, type: 'success', message: '' })} 
        />
      )}
      <div className="hidden md:flex w-1/2 bg-[#0a0f1c] relative flex-col justify-between p-8 lg:p-12 xl:p-16 overflow-hidden shrink-0">
        <style>
          {`
            @keyframes bgGlowPulse {
              0% { opacity: 0.4; transform: scale(0.95); filter: blur(100px); }
              50% { opacity: 0.8; transform: scale(1.05); filter: blur(120px); }
              100% { opacity: 0.4; transform: scale(0.95); filter: blur(100px); }
            }
            @keyframes textGradientFlow {
              to { background-position: -300% center; }
            }
            .animate-bg-glow-1 {
              animation: bgGlowPulse 6s ease-in-out infinite;
            }
            .animate-bg-glow-2 {
              animation: bgGlowPulse 8s ease-in-out infinite reverse;
            }
            .animate-text-flow {
              background-image: linear-gradient(to right, #60a5fa 0%, #818cf8 33.33%, #5eead4 66.66%, #60a5fa 100%);
              background-size: 300% auto;
              animation: textGradientFlow 12s linear infinite;
            }
          `}
        </style>

        <div className="absolute top-[20%] -left-[300px] w-[800px] h-[800px] bg-[#1d4ed8]/25 rounded-full pointer-events-none animate-bg-glow-1" />
        <div className="absolute top-[35%] -left-[200px] w-[500px] h-[500px] bg-[#14b8a6]/20 rounded-full pointer-events-none animate-bg-glow-2" />
        
        <div className="relative z-10 flex flex-col">
          <div className="flex flex-col items-start mb-16 xl:mb-20">
            <img src={vobiLogoLight} alt="Vobi Logo" className="w-[160px] lg:w-[180px] xl:w-[220px] h-auto object-contain -ml-2" />
            <span className="text-[11px] lg:text-xs tracking-[0.25em] font-bold uppercase mt-1.5 ml-1 bg-clip-text text-transparent animate-text-flow drop-shadow-sm">
              Autonomous VOB Agent
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e293b]/50 border border-[#334155]/50 mb-6 lg:mb-8 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-fit transition-all duration-500">
            {isBackendOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] font-bold text-emerald-400/90 tracking-[0.15em] uppercase">Voice Agent Online</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-dot shadow-[0_0_12px_rgba(248,113,113,0.8)]" />
                <span className="text-[10px] font-bold text-red-400/90 tracking-[0.15em] uppercase">Voice Agent Offline</span>
              </>
            )}
          </div>

          <h1 className="text-[28px] lg:text-[32px] xl:text-[36px] font-semibold text-white leading-[1.2] tracking-[-0.02em] mb-4 drop-shadow-sm">
            Insurance calls,<br />handled autonomously.
          </h1>
          
          <p className="text-[#94a3b8] text-sm leading-relaxed max-w-[520px] mb-8 lg:mb-10 pr-4">
            Vobi dials payers, navigates IVR trees, waits on hold and returns clean benefits data — so your team never sits on a phone again.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconAuthCheck />
              <span className="text-sm text-[#cbd5e1]">Average VOB resolved in 4 minutes, hands-free</span>
            </div>
            <div className="flex items-center gap-3">
              <IconAuthCheck />
              <span className="text-sm text-[#cbd5e1]">Live transcript of every insurer call</span>
            </div>
            <div className="flex items-center gap-3">
              <IconAuthCheck />
              <span className="text-sm text-[#cbd5e1]">Structured benefits data, ready for your EHR</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 lg:mt-0 mb-2">
          <p className="text-xs text-[#64748b] tracking-wide">
            HIPAA-conscious by design · SOC 2 program in progress
          </p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 sm:p-8 bg-white z-20 shrink-0">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-start text-left">
            <h2 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
              {isSignUp ? 'Create your workspace' : 'Welcome back'}
            </h2>
            <p className="text-sm text-gray-500">
              {isSignUp ? 'Start verifying benefits in minutes.' : 'Sign in to pick up where you left off.'}
            </p>
          </div>

          <div className="flex bg-[#f3f4f6] p-1 rounded-full mb-6 relative shadow-inner">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out`}
              style={{ transform: isSignUp ? 'translateX(100%)' : 'translateX(0)' }}
            />
            
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-[13px] font-medium rounded-lg z-10 transition-colors duration-200 ${!isSignUp ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-200 ${isSignUp ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign up
            </button>
          </div>

          <button 
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#f1f5f9] rounded-full text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] active:scale-[0.99]"
          >
            <IconGoogle />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#e5e7eb]"></div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[#e5e7eb]"></div>
          </div>



          <div className="relative">
            <form onSubmit={handleSubmit} className={`space-y-4 transition-all duration-300 ${!isSignUp ? 'opacity-100 z-10 relative' : 'opacity-0 z-0 absolute inset-0 pointer-events-none'}`}>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Work email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <IconEnvelope className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required={!isSignUp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-[11px] ml-4 mt-1">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1 pr-1">
                  <label className="text-[13px] font-medium text-gray-700">Password</label>
                  <button type="button" onClick={handleForgotPassword} className="text-[13px] font-medium text-brand-600 hover:text-brand-700">Forgot?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <IconLock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required={!isSignUp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-[11px] ml-4 mt-1">{errors.password}</p>}
              </div>
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium shadow-[0_4px_12px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'} <span className="font-sans font-light">&rarr;</span>
              </button>
              <p className="text-center text-[13px] text-gray-500 pt-3">
                New to Vobi? <button type="button" onClick={() => setIsSignUp(true)} className="text-brand-600 font-medium hover:underline">Create an account</button>
              </p>
            </form>

            <form onSubmit={handleSubmit} className={`space-y-4 transition-all duration-300 ${isSignUp ? 'opacity-100 z-10 relative' : 'opacity-0 z-0 absolute inset-0 pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700 ml-1">Full name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <IconUser className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alicia Reyes"
                      className={`w-full pl-9 pr-3 py-3 bg-white border ${errors.fullName ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-[11px] ml-3 mt-1">{errors.fullName}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700 ml-1">Organization</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <IconBuilding className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Northside..."
                      className={`w-full pl-9 pr-3 py-3 bg-white border ${errors.organization ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                    />
                  </div>
                  {errors.organization && <p className="text-red-500 text-[11px] ml-3 mt-1">{errors.organization}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Work email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <IconEnvelope className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required={isSignUp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-[11px] ml-4 mt-1">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <IconLock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required={isSignUp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-[#f1f5f9]'} rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-[11px] ml-4 mt-1">{errors.password}</p>}
              </div>
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium shadow-[0_4px_12px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'} <span className="font-sans font-light">&rarr;</span>
              </button>
              <p className="text-center text-[11px] text-gray-400 pt-3">
                By continuing you agree to our terms and privacy policy.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
