import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-secondary-50 text-secondary-700',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-7">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-primary-400 mb-2">{title}</p>
          <p className="text-[28px] font-bold text-primary-900 tracking-tight leading-none">
            {value}
          </p>
          {change && (
            <p
              className={clsx(
                'mt-2 text-[12px] font-medium',
                changeType === 'positive' && 'text-success-600',
                changeType === 'negative' && 'text-danger-500',
                changeType === 'neutral' && 'text-primary-400',
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={clsx('p-3.5 rounded-2xl', iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
