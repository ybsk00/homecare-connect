'use client';

import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.replace(/\s/g, '-').toLowerCase();

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[13px] font-semibold text-primary-600 mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'block w-full rounded-xl px-4 py-3 text-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-secondary-500/30',
          error
            ? 'bg-danger-50 text-danger-600 placeholder-danger-300'
            : 'bg-primary-50/60 text-primary-800 placeholder-primary-300',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[12px] text-danger-500">{error}</p>}
    </div>
  );
}
