import React from 'react';
import { IconShield, IconAlertCircle } from './icons';

export function PendingScreen({ onLogout }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconShield className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Under Review</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your account has been successfully created. For security purposes, an administrator must verify your details before granting access. We'll send you an email once approved.
        </p>
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function RejectedScreen({ onLogout }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconAlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Unfortunately, your request for access to Vobi has been declined by the administrator. If you believe this is a mistake, please contact support.
        </p>
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
