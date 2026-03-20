'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Calendar } from 'lucide-react';
import { clsx } from 'clsx';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function WeekSchedulePreview() {
  const { data: weekData = [], isLoading } = useQuery({
    queryKey: ['week-schedule-preview'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
      }

      const { data } = await supabase
        .from('visits')
        .select('scheduled_date, status')
        .gte('scheduled_date', days[0])
        .lte('scheduled_date', days[6]);

      const countByDay = days.map((date) => {
        const dateVisits = (data || []).filter(
          (v: { scheduled_date: string }) => v.scheduled_date === date
        );
        return {
          date,
          dayLabel:
            DAY_LABELS[new Date(date + 'T00:00:00').getDay()],
          total: dateVisits.length,
          completed: dateVisits.filter(
            (v: { status: string }) => v.status === 'completed'
          ).length,
          isToday: date === today.toISOString().split('T')[0],
        };
      });

      return countByDay;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>이번 주 스케줄</CardTitle>
        <Calendar className="h-5 w-5 text-on-surface-variant" />
      </CardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div
            className="h-6 w-6 animate-spin rounded-full bg-gradient-to-r from-primary to-secondary"
            style={{
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {weekData.map((day) => (
            <div
              key={day.date}
              className={clsx(
                'flex flex-col items-center rounded-xl p-4 transition-colors',
                day.isToday
                  ? 'bg-secondary/10'
                  : 'bg-surface-container-low/50'
              )}
            >
              <span
                className={clsx(
                  'text-xs font-semibold',
                  day.isToday ? 'text-secondary' : 'text-on-surface-variant'
                )}
              >
                {day.dayLabel}
              </span>
              <span
                className={clsx(
                  'mt-2 text-xl font-bold',
                  day.isToday ? 'text-secondary' : 'text-on-surface'
                )}
              >
                {day.total}
              </span>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: Math.min(day.total, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'h-1.5 w-1.5 rounded-full',
                      i < day.completed
                        ? day.isToday ? 'bg-secondary' : 'bg-primary'
                        : 'bg-outline-variant'
                    )}
                  />
                ))}
              </div>
              <span className="mt-1 text-[10px] text-on-surface-variant">
                완료 {day.completed}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
