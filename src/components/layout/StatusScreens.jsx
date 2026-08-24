import React from 'react';
import { IconShield, IconAlertCircle } from '../ui/icons';

export function PendingScreen({ onLogout }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
        <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-6">
          <IconShield className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Account Under Review</h1>
        <p className="text-text-secondary mb-6 leading-relaxed">
          Your account is currently pending administrator approval. We will notify you once your access is granted.
        </p>
        <button 
          onClick={onLogout}
          className="w-full py-3 px-4 bg-surface border border-border text-text-secondary rounded-xl font-medium hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function RejectedScreen({ onLogout }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-page-bg p-6">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
        <div className="w-16 h-16 bg-status-danger rounded-full flex items-center justify-center mx-auto mb-6">
          <IconAlertCircle className="w-8 h-8 text-status-danger-text" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Unfortunately, your request for access to Vobi has been declined by the administrator. If you believe this is a mistake, please contact support.
        </p>
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-surface border border-border text-text-secondary rounded-xl font-medium hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
