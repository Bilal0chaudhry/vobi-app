import React, { useEffect, useState } from 'react';

export default function Toast({ type, message, duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isError = type === 'error';
  const textColor = isError ? 'text-status-danger-text' : 'text-status-success-text';
  const barColor = isError ? 'bg-[var(--color-danger-text)]' : 'bg-[var(--color-success-text)]';

  return (
    <div 
      className={`fixed top-4 left-4 right-4 md:top-6 md:left-auto md:right-6 md:w-[320px] z-50 flex flex-col bg-surface rounded-xl shadow-xl overflow-hidden border border-border ${isExiting ? 'toast-exit' : 'toast-enter'}`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        {isError ? (
          <svg className={`w-5 h-5 ${textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 ${textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className={`text-sm font-bold ${textColor}`}>{message}</span>
      </div>
      
      <div className="h-1 w-full bg-surface-inset">
        <div 
          className={`h-full ${barColor} toast-progress`} 
          style={{ animationDuration: `${duration}ms` }} 
        />
      </div>
    </div>
  );
}
