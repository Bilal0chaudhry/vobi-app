import React, { useState } from 'react';
import vobiLogoLight from '../assets/vobi-logo.png';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#312e81" fillOpacity="0.4" />
      <path d="M16 9L10.5 14.5L8 12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
  );
}

import { supabase } from '../utils/supabase';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

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
        if (error) throw error;
        
        if (!data.session) {
          setErrorMsg("Account created! Please check your email to confirm your address before signing in.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message);
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
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white animate-fade-in">
      {/* Left Panel - Dark (Exactly 50%) */}
      <div className="hidden md:flex w-1/2 bg-[#0a0f1c] relative flex-col justify-between p-8 lg:p-12 xl:p-16 overflow-hidden shrink-0">
        {/* Subtle background glow originating from the left */}
        <div className="absolute top-[20%] -left-[300px] w-[800px] h-[800px] bg-[#1d4ed8]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] -left-[200px] w-[500px] h-[500px] bg-[#14b8a6]/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col">
          {/* Logo */}
          <div className="flex items-center mb-4 xl:mb-6">
            <img src={vobiLogoLight} alt="Vobi Logo" className="w-[160px] lg:w-[180px] xl:w-[220px] h-auto object-contain -ml-2" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e293b]/50 border border-[#334155]/50 mb-6 lg:mb-8 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-bold text-slate-300 tracking-[0.15em] uppercase">Voice Agent Online</span>
          </div>

          <h1 className="text-[28px] lg:text-[32px] xl:text-[36px] font-semibold text-white leading-[1.2] tracking-[-0.02em] mb-4 drop-shadow-sm">
            Insurance calls,<br />handled autonomously.
          </h1>
          
          <p className="text-[#94a3b8] text-sm leading-relaxed max-w-[520px] mb-8 lg:mb-10 pr-4">
            Vobi dials payers, navigates IVR trees, waits on hold and returns clean benefits data — so your team never sits on a phone again.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckIcon />
              <span className="text-sm text-[#cbd5e1]">Average VOB resolved in 4 minutes, hands-free</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckIcon />
              <span className="text-sm text-[#cbd5e1]">Live transcript of every insurer call</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckIcon />
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

      {/* Right Panel - Form (Exactly 50% on md+) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 sm:p-8 bg-white z-20 shrink-0">
        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start text-left">
            <h2 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
              {isSignUp ? 'Create your workspace' : 'Welcome back'}
            </h2>
            <p className="text-sm text-gray-500">
              {isSignUp ? 'Start verifying benefits in minutes.' : 'Sign in to pick up where you left off.'}
            </p>
          </div>

          {/* Segmented Control */}
          <div className="flex bg-[#f3f4f6] p-1 rounded-full mb-6 relative shadow-inner">
            {/* Sliding background */}
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

          {/* Google Button */}
          <button 
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#f1f5f9] rounded-full text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] active:scale-[0.99]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#e5e7eb]"></div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[#e5e7eb]"></div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          {/* Form Wrapper for smooth opacity transition */}
          <div className="relative">
            <form onSubmit={handleSubmit} className={`space-y-4 transition-all duration-300 ${!isSignUp ? 'opacity-100 z-10 relative' : 'opacity-0 z-0 absolute inset-0 pointer-events-none'}`}>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Work email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <EnvelopeIcon />
                  </div>
                  <input
                    type="email"
                    required={!isSignUp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1 pr-1">
                  <label className="text-[13px] font-medium text-gray-700">Password</label>
                  <button type="button" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">Forgot?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    required={!isSignUp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium shadow-[0_4px_12px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
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
                      <UserIcon />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alicia Reyes"
                      className="w-full pl-9 pr-3 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700 ml-1">Organization</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <BuildingIcon />
                    </div>
                    <input
                      type="text"
                      required={isSignUp}
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Northside..."
                      className="w-full pl-9 pr-3 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Work email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <EnvelopeIcon />
                  </div>
                  <input
                    type="email"
                    required={isSignUp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    required={isSignUp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#f1f5f9] rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium shadow-[0_4px_12px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
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
