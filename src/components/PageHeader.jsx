import React from 'react';
import { IconPlus } from './icons';
import Button from './ui/Button';

export default function PageHeader({ title, subtitle, onNewVerification, buttonId = 'btn-new-verification' }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {onNewVerification && (
        <Button id={buttonId} onClick={onNewVerification}>
          <IconPlus />
          New Verification
        </Button>
      )}
    </div>
  );
}
