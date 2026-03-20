import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  iconBg = 'bg-secondary/10 text-secondary',
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-on-surface">{value}</p>
        </div>
        <div className={clsx('flex h-11 w-11 items-center justify-center rounded-full', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
