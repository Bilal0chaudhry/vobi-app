import React, { useState, useRef, useEffect } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import { IconDashboard, IconCallHistory, IconSettings, IconShield, IconX, IconSun, IconMonitor, IconMoon } from '../ui/icons';
import VobiLogo from '../ui/VobiLogo';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { key: 'callHistory', label: 'History', Icon: IconCallHistory },
  { key: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar({ currentView, onNavigate, isAdmin, onLogout, profile, isOpen, onClose, theme, onThemeChange }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const menuRef = useRef(null);
  const sidebarRef = useRef(null);

  useClickOutside(menuRef, () => setShowSignOut(false), showSignOut);

  // Body scroll lock on mobile when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden" 
          onClick={onClose} 
        />
      )}
      
      {/* Sidebar Panel */}
      <aside 
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-screen w-[240px] md:w-[200px] bg-surface border-r border-border flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
        }`}
      >
      <div className="px-4 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between gap-0.5">
        <div className="flex flex-col items-start gap-0.5">
          <VobiLogo size="md" />
          <p className="text-[10px] font-semibold text-accent tracking-wider uppercase pl-0.5">
            Autonomous VOB Agent
          </p>
        </div>
        <button 
          onClick={onClose} 
          className="md:hidden w-8 h-8 rounded-lg bg-surface-inset flex items-center justify-center text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Workspace</p>
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
                ? 'bg-accent-subtle text-accent'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border-subtle relative flex flex-col gap-3" ref={menuRef}>
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
            <div className="px-4 py-3 border-b border-border-subtle bg-surface-inset">
               <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Signed in as</p>
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
                 <p className="text-xs font-semibold text-text-primary whitespace-nowrap block transition-transform duration-[800ms] ease-out">
                   {profile?.email || 'admin@vobi.com'}
                 </p>
               </div>
            </div>
            <button
              onClick={() => {
                setShowSignOut(false);
                onLogout();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-status-danger-text hover:bg-status-danger transition-all duration-200 group"
            >
              <span>Sign out</span>
              <span className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 ease-out">
                &rarr;
              </span>
            </button>
          </div>
        )}
        
        {theme && (
          <div className="flex bg-surface-inset p-1 rounded-full relative shadow-inner mb-2 -mx-2">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-surface rounded-full shadow-sm transition-transform duration-300 ease-out`}
              style={{ transform: theme === 'light' ? 'translateX(0)' : theme === 'system' ? 'translateX(100%)' : 'translateX(200%)' }}
            />
            
            <button
              onClick={() => onThemeChange('light')}
              title="Light Mode"
              aria-label="Light Mode"
              aria-pressed={theme === 'light'}
              className={`flex-1 py-1.5 flex items-center justify-center z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset transition-colors duration-200 ${theme === 'light' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <IconSun className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('system')}
              title="System Theme"
              aria-label="System Theme"
              aria-pressed={theme === 'system'}
              className={`flex-1 py-1.5 flex items-center justify-center z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset transition-colors duration-200 ${theme === 'system' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <IconMonitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              title="Dark Mode"
              aria-label="Dark Mode"
              aria-pressed={theme === 'dark'}
              className={`flex-1 py-1.5 flex items-center justify-center z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset transition-colors duration-200 ${theme === 'dark' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <IconMoon className="w-4 h-4" />
            </button>
          </div>
        )}

        <button 
          onClick={() => setShowSignOut(!showSignOut)}
          className={`w-full flex items-center gap-3 p-2 -mx-2 rounded-xl transition-all duration-300 group ${showSignOut ? 'bg-surface-inset shadow-inner' : 'hover:bg-surface-hover'}`}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500 ${
            showSignOut 
              ? 'bg-gradient-to-br from-accent to-accent-hover text-accent-on-accent shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' 
              : 'bg-accent-subtle text-accent group-hover:bg-accent-subtle group-hover:scale-105'
          }`}>
            {initials}
          </div>
          <div className="min-w-0 text-left flex-1 transition-opacity duration-300">
            <p className="text-[13px] font-bold text-text-primary truncate leading-tight">{fullName}</p>
            <p className="text-[11px] font-medium text-text-secondary truncate mt-0.5">{org}</p>
          </div>
          <div className={`shrink-0 text-text-tertiary transition-transform duration-300 mr-1 ${showSignOut ? 'rotate-180 text-accent' : 'group-hover:translate-y-[-2px]'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </div>
        </button>
      </div>
    </aside>
    </>
  );
}
