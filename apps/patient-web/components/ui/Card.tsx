import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
  elevated?: boolean;
}

export function Card({
  children,
  padding = true,
  elevated = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-surface-container-lowest',
        padding && 'p-6',
        elevated && 'shadow-[0_10px_40px_rgba(24,28,30,0.05)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mb-6 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={clsx('text-lg font-semibold text-on-surface', className)}>
      {children}
    </h3>
  );
}
