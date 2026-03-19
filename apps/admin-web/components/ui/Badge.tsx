import { clsx } from 'clsx';
import type { BadgeColor } from '@homecare/shared-types';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorStyles: Record<BadgeColor, string> = {
  gray: 'bg-primary-50 text-primary-500',
  green: 'bg-success-50 text-success-600',
  yellow: 'bg-warning-50 text-warning-600',
  red: 'bg-danger-50 text-danger-600',
  blue: 'bg-secondary-50 text-secondary-700',
  navy: 'bg-primary-100 text-primary-800',
  teal: 'bg-secondary-100 text-secondary-700',
  brown: 'bg-tertiary-50 text-tertiary-600',
  purple: 'bg-purple-50 text-purple-700',
};

export default function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide',
        colorStyles[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
