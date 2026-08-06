import React from 'react';
import { IconDashboard, IconCallHistory, IconSettings } from './icons';
import VobiLogo from './VobiLogo';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { key: 'callHistory', label: 'Call History', Icon: IconCallHistory },
  { key: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function Sidebar({ currentView, onNavigate }) {
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
        {NAV_ITEMS.map(({ key, label, Icon }) => {
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
