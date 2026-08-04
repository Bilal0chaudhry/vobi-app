import React from 'react';
import { IconDashboard, IconCallHistory, IconSettings } from './icons';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',    Icon: IconDashboard },
  { key: 'callHistory', label: 'Call History', Icon: IconCallHistory },
  { key: 'settings',    label: 'Settings',     Icon: IconSettings },
];

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <aside className="fixed top-0 left-0 h-screen w-[200px] bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/30">
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Vobi</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Autonomous VOB Agent</p>
          </div>
        </div>
      </div>

      {/* Workspace label */}
      <div className="px-5 pb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workspace</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = currentView === key || (key === 'dashboard' && currentView === 'liveView');
          return (
            <button
              key={key}
              id={`nav-${key}`}
              onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
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

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
            AR
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">Alicia Reyes</p>
            <p className="text-[10px] text-gray-500 truncate">Northside Cardiology</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
