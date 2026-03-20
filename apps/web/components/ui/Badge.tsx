import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'orange';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-container-high text-on-surface-variant',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-secondary/10 text-on-secondary-container',
  danger: 'bg-error/10 text-error',
  warning: 'bg-tertiary/10 text-tertiary',
  orange: 'bg-tertiary-container text-tertiary',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(
  status: string
): BadgeVariant {
  switch (status) {
    case 'active':
    case 'completed':
    case 'verified':
    case 'org_accepted':
    case 'service_started':
    case 'doctor_reviewed':
    case 'sent':
    case 'paid':
      return 'success';
    case 'scheduled':
    case 'en_route':
    case 'checked_in':
    case 'in_progress':
    case 'matching':
    case 'waiting_selection':
    case 'sent_to_org':
    case 'generating':
    case 'generated':
    case 'trial':
      return 'primary';
    case 'paused':
    case 'pending':
    case 'assessment_scheduled':
    case 'draft':
    case 'pending_consent':
    case 'past_due':
      return 'warning';
    case 'cancelled':
    case 'discharged':
    case 'rejected':
    case 'suspended':
    case 'org_rejected':
    case 'no_show':
    case 'error':
    case 'failed':
      return 'danger';
    case 'expired':
    case 'terminated':
    case 'checked_out':
      return 'orange';
    default:
      return 'default';
  }
}
