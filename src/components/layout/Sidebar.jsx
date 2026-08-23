import React, { useState, useRef } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import { IconDashboard, IconCallHistory, IconSettings, IconShield } from '../ui/icons';
import VobiLogo from '../ui/VobiLogo';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { key: 'callHistory', label: 'History', Icon: IconCallHistory },
  { key: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar({ currentView, onNavigate, isAdmin, onLogout, profile }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const menuRef = useRef(null);

  useClickOutside(menuRef, () => setShowSignOut(false), showSignOut);

  const items = [...NAV_ITEMS];
  if (isAdmin) {
    items.push({ key: 'admin', label: 'Admin', Icon: IconShield });
  }

  const fullName = profile?.full_name || 'Name not set';
  const org = profile?.organization || 'No organization';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="fixed top-0 left-0 h-screen w-[200px] bg-white border-r border-gray-200 flex flex-col z-30">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex flex-col items-start gap-0.5">
        <VobiLogo size="md" />
        <p className="text-[10px] font-semibold text-brand-600 tracking-wider uppercase pl-0.5">
          Autonomous VOB Agent
        </p>
      </div>

      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workspace</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {items.map(({ key, label, Icon }) => {
          const isActive = currentView === key || (key === 'dashboard' && currentView === 'liveView');
          return (
            <button
              key={key}
              id={`nav-${key}`}
              onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100 relative" ref={menuRef}>
        {showSignOut && (
          <div 
            className="absolute bottom-[calc(100%+12px)] left-4 w-[calc(100%-32px)] z-50 animate-fade-in origin-bottom rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: 'inset 0px 1px 1px rgba(255, 255, 255, 0.9), inset 0px -1px 1px rgba(0, 0, 0, 0.05), 0 10px 40px rgba(0,0,0,0.15)',
              borderTop: '1px solid rgba(255,255,255,0.8)',
              borderLeft: '1px solid rgba(255,255,255,0.6)',
              borderRight: '1px solid rgba(255,255,255,0.3)',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div className="px-4 py-3 border-b border-slate-200/40 bg-slate-50/30">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Signed in as</p>
               <div 
                 className="relative w-full overflow-hidden cursor-default transition-all duration-[800ms]"
                 style={{ WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}
                 onMouseEnter={(e) => {
                   const p = e.currentTarget.querySelector('p');
                   const cw = e.currentTarget.clientWidth;
                   const tw = p.scrollWidth;
                   e.currentTarget.style.WebkitMaskImage = 'linear-gradient(to right, black 95%, transparent 100%)';
                   if (tw > cw) {
                     p.style.transform = `translateX(-${tw - cw}px)`;
                   }
                 }}
                 onMouseLeave={(e) => {
                   const p = e.currentTarget.querySelector('p');
                   e.currentTarget.style.WebkitMaskImage = 'linear-gradient(to right, black 85%, transparent 100%)';
                   p.style.transform = 'translateX(0)';
                 }}
               >
                 <p className="text-xs font-semibold text-slate-700 whitespace-nowrap block transition-transform duration-[800ms] ease-out">
                   {profile?.email || 'admin@vobi.com'}
                 </p>
               </div>
            </div>
            <button
              onClick={() => {
                setShowSignOut(false);
                onLogout();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-red-600 hover:bg-red-50/50 hover:text-red-700 transition-all duration-200 group"
            >
              <span>Sign out</span>
              <span className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 ease-out">
                &rarr;
              </span>
            </button>
          </div>
        )}
        
        <button 
          onClick={() => setShowSignOut(!showSignOut)}
          className={`w-full flex items-center gap-3 p-2 -mx-2 rounded-xl transition-all duration-300 group ${showSignOut ? 'bg-slate-100 shadow-inner' : 'hover:bg-slate-50'}`}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500 ${
            showSignOut 
              ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' 
              : 'bg-brand-100 text-brand-700 group-hover:bg-brand-200 group-hover:scale-105'
          }`}>
            {initials}
          </div>
          <div className="min-w-0 text-left flex-1 transition-opacity duration-300">
            <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">{fullName}</p>
            <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{org}</p>
          </div>
          <div className={`shrink-0 text-slate-400 transition-transform duration-300 mr-1 ${showSignOut ? 'rotate-180 text-brand-500' : 'group-hover:translate-y-[-2px]'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </div>
        </button>
      </div>
    </aside>
  );
}
