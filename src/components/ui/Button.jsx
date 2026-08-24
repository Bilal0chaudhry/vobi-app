import React from 'react';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  id,
}) {
  const baseClasses = 'flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.98]';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-lg',
  };

  const variantClasses = {
    primary: disabled
      ? 'bg-surface-inset text-text-tertiary cursor-not-allowed active:scale-100'
      : 'bg-accent text-accent-on-accent shadow-md shadow-accent/25 hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30',
    secondary: disabled
      ? 'bg-surface-inset text-text-tertiary cursor-not-allowed active:scale-100'
      : 'bg-surface-inset text-text-primary hover:bg-surface-hover',
    danger: disabled
      ? 'bg-surface-inset text-text-tertiary cursor-not-allowed active:scale-100'
      : 'bg-status-danger text-status-danger-text hover:opacity-80',
    ghost: disabled
      ? 'text-text-tertiary cursor-not-allowed active:scale-100'
      : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
    >
      {children}
    </button>
  );
}
