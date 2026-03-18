'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'gradient-button text-white hover:shadow-lg hover:shadow-primary-900/20 active:scale-[0.98]',
  secondary:
    'gradient-teal text-white hover:shadow-lg hover:shadow-secondary-700/20 active:scale-[0.98]',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 hover:shadow-lg hover:shadow-danger-500/20 active:scale-[0.98]',
  ghost:
    'text-primary-500 hover:bg-primary-50 active:bg-primary-100',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-[13px] rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-[15px] rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
