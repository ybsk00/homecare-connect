'use client';

import { clsx } from 'clsx';
import type { VisitSlotData } from '@homecare/shared-types';

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary/10 text-primary',
  en_route: 'bg-tertiary/10 text-tertiary',
  checked_in: 'bg-tertiary/10 text-tertiary',
  in_progress: 'bg-tertiary/10 text-tertiary',
  completed: 'bg-secondary/10 text-secondary',
  cancelled: 'bg-error/10 text-error',
  no_show: 'bg-error/10 text-error',
};

interface VisitSlotProps {
  visit: VisitSlotData;
}

export function VisitSlot({ visit }: VisitSlotProps) {
  return (
    <div
      className={clsx(
        'rounded-xl px-2.5 py-2 text-xs',
        statusColors[visit.status] || 'bg-surface-container-high text-on-surface-variant'
      )}
    >
      <div className="font-semibold">{visit.patient_name}</div>
      <div className="mt-0.5 opacity-70">
        {visit.scheduled_time ? visit.scheduled_time.slice(0, 5) : '--:--'}
      </div>
    </div>
  );
}
