'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ScheduleCalendar } from '@/components/hospital/schedule/ScheduleCalendar';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

function getWeekDates(baseDate: Date): string[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const today = new Date().toISOString().split('T')[0];

  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ['schedule', weekDates[0], weekDates[6]],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();

      const { data: staffList } = await supabase
        .from('staff')
        .select('id, profiles!inner(full_name)')
        .eq('is_active', true);

      if (!staffList || staffList.length === 0) return [];

      const { data: visits } = await supabase
        .from('visits')
        .select('id, nurse_id, patient_id, scheduled_date, scheduled_time, status, patients(full_name)')
        .gte('scheduled_date', weekDates[0])
        .lte('scheduled_date', weekDates[6]);

      return staffList.map((s: Record<string, unknown>) => {
        const profile = s.profiles as { full_name: string } | null;
        const staffVisits = (visits || [])
          .filter((v: Record<string, unknown>) => v.nurse_id === s.id)
          .map((v: Record<string, unknown>) => ({
            id: v.id as string,
            patient_name: (v.patients as { full_name: string } | null)?.full_name || '-',
            scheduled_time: v.scheduled_time as string | null,
            scheduled_date: v.scheduled_date as string,
            status: v.status as string,
          }));

        return {
          nurse_id: s.id as string,
          nurse_name: profile?.full_name || '-',
          visits: staffVisits,
        };
      });
    },
  });

  const weekLabel = `${weekDates[0].slice(5)} ~ ${weekDates[6].slice(5)}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">스케줄 관리</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            간호사별 주간 방문 스케줄을 확인합니다.
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-on-surface">
            <Calendar className="h-4 w-4 text-on-surface-variant" />
            {weekLabel}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
            >
              오늘
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <ScheduleCalendar
          nurses={nurses}
          weekDates={weekDates}
          today={today}
        />
      )}
    </div>
  );
}
