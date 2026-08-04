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
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed active:scale-100'
      : 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30',
    secondary: disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed active:scale-100'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: disabled
      ? 'bg-red-50 text-red-200 cursor-not-allowed active:scale-100'
      : 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: disabled
      ? 'text-gray-400 cursor-not-allowed active:scale-100'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
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
