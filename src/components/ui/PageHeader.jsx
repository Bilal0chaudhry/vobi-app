import React from 'react';
import { IconPlus } from './icons';
import Button from './Button';

export default function PageHeader({ title, subtitle, onNewVerification, buttonId = 'btn-new-verification', isAtCapacity = false }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {onNewVerification && (
        <div title={isAtCapacity ? "Maximum of 10 active requests reached. Please wait for one to complete." : ""}>
          <Button 
            id={buttonId} 
            onClick={onNewVerification}
            disabled={isAtCapacity}
            className={isAtCapacity ? 'opacity-50' : ''}
          >
            <IconPlus />
            New Verification
          </Button>
        </div>
      )}
    </div>
  );
}
