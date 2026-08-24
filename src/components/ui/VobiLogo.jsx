import React from 'react';
import vobiLogo from '../../assets/vobi-logo.png';

export default function VobiLogo({ size = 'md', className = '' }) {
  const logoHeights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-14',
    xl: 'h-20',
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src={vobiLogo}
        alt="VOBI Logo"
        className={`${logoHeights[size]} w-auto object-contain transition-all duration-300 hover:scale-105 dark:brightness-125 dark:drop-shadow-[0_0_10px_rgba(129,140,248,0.35)]`}
      />
    </div>
  );
}
