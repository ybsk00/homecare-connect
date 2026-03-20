'use client';

import { clsx } from 'clsx';
import { VisitSlot } from './VisitSlot';
import type { NurseSchedule } from '@homecare/shared-types';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

interface ScheduleCalendarProps {
  nurses: NurseSchedule[];
  weekDates: string[];
  today: string;
}

export function ScheduleCalendar({
  nurses,
  weekDates,
  today,
}: ScheduleCalendarProps) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-primary px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white">
              간호사
            </th>
            {weekDates.map((date, i) => {
              const isToday = date === today;
              return (
                <th
                  key={date}
                  className={clsx(
                    'min-w-[140px] px-4 py-4 text-center text-xs font-semibold',
                    isToday
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-primary text-white/80'
                  )}
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="mt-0.5 text-[11px] font-normal opacity-70">
                    {date.slice(5)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {nurses.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-14 text-center text-sm text-on-surface-variant"
              >
                스케줄 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            nurses.map((nurse, idx) => (
              <tr
                key={nurse.nurse_id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
              >
                <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5">
                  <span className="text-sm font-medium text-on-surface">
                    {nurse.nurse_name}
                  </span>
                </td>
                {weekDates.map((date) => {
                  const dayVisits = nurse.visits.filter(
                    (v) => v.scheduled_date === date
                  );
                  return (
                    <td key={date} className="px-2 py-2">
                      <div className="space-y-1.5">
                        {dayVisits.map((v) => (
                          <VisitSlot key={v.id} visit={v} />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
