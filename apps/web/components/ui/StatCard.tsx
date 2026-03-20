import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  iconBg?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  iconBg = 'bg-secondary/10 text-secondary',
  className,
}: StatCardProps) {
  const trendIsPositive = trend && trend.value > 0;
  const trendIsNegative = trend && trend.value < 0;

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
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {trendIsPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-secondary" />
          ) : trendIsNegative ? (
            <TrendingDown className="h-3.5 w-3.5 text-tertiary" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-on-surface-variant" />
          )}
          <span
            className={clsx(
              'font-semibold',
              trendIsPositive && 'text-secondary',
              trendIsNegative && 'text-tertiary',
              !trendIsPositive && !trendIsNegative && 'text-on-surface-variant'
            )}
          >
            {trendIsPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-on-surface-variant">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
