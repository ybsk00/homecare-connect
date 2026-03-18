'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={clsx(
          'w-full mx-4 bg-white rounded-2xl shadow-[var(--shadow-elevated)]',
          sizeStyles[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-7 py-5">
            <h3 className="text-lg font-bold text-primary-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-7 pb-7">{children}</div>
      </div>
    </div>
  );
}
