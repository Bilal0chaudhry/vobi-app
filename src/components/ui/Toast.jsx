import React, { useEffect, useState } from 'react';

export default function Toast({ type, message, duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // wait for exit animation to complete
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isError = type === 'error';
  const textColor = isError ? 'text-red-600' : 'text-emerald-600';
  const barColor = isError ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div 
      className={`fixed top-6 right-6 z-50 flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 ${isExiting ? 'toast-exit' : 'toast-enter'}`} 
      style={{ minWidth: '320px' }}
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
      
      {/* Shrinking Loading Bar */}
      <div className="h-1 w-full bg-gray-50">
        <div 
          className={`h-full ${barColor} toast-progress`} 
          style={{ animationDuration: `${duration}ms` }} 
        />
      </div>
    </div>
  );
}
