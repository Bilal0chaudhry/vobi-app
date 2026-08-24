import React from 'react';
import { IconX } from './icons';

export default function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end modal-overlay" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <div
        className={`relative w-full ${maxWidth} bg-surface shadow-2xl border-l border-border flex flex-col modal-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-inset hover:bg-surface-hover flex items-center justify-center transition-colors"
        >
          <IconX className="w-4 h-4 text-text-secondary" />
        </button>

        <div className="p-6 flex-1 overflow-y-auto">
          {title && <h2 className="text-lg font-bold text-text-primary mb-1">{title}</h2>}
          {description && <p className="text-sm text-text-secondary mb-6">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
