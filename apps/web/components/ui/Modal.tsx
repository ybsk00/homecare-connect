'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glassmorphism backdrop */}
      <div
        className="fixed inset-0 bg-primary/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative z-10 mx-4 w-full rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.12)]',
          sizeStyles[size]
        )}
      >
        {title && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}
