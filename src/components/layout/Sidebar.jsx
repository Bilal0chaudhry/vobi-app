import React, { useState, useRef, useEffect } from 'react';
import { IconDashboard, IconCallHistory, IconSettings, IconShield } from '../ui/icons';
import VobiLogo from '../ui/VobiLogo';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { key: 'callHistory', label: 'Call History', Icon: IconCallHistory },
  { key: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar({ currentView, onNavigate, isAdmin, onLogout, profile }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowSignOut(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      <div className="px-4 py-4 border-t border-gray-100 relative" ref={menuRef}>
        {showSignOut && (
          <div className="absolute bottom-full left-4 mb-2 w-[calc(100%-32px)] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden animate-fade-in z-50 origin-bottom">
            <button
              onClick={() => {
                setShowSignOut(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        
        <button 
          onClick={() => setShowSignOut(!showSignOut)}
          className={`w-full flex items-center gap-2.5 p-2 -mx-2 rounded-xl transition-all duration-200 ${showSignOut ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 text-left flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{fullName}</p>
            <p className="text-[10px] text-gray-500 truncate">{org}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
