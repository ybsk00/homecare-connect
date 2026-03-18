'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Clock, MapPin, User } from 'lucide-react';

interface VisitSummary {
  id: string;
  scheduled_time: string | null;
  status: string;
  patient_name: string;
  nurse_name: string;
}

export function TodayVisitSummary() {
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['today-visits'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_time,
          status,
          patients!inner(full_name),
          staff!inner(profiles!inner(full_name))
        `)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true })
        .limit(10);

      if (!data) return [];

      return data.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        scheduled_time: v.scheduled_time as string | null,
        status: v.status as string,
        patient_name: (v.patients as Record<string, unknown>)?.full_name as string || '-',
        nurse_name: ((v.staff as Record<string, unknown>)?.profiles as Record<string, unknown>)?.full_name as string || '-',
      }));
    },
  });

  const statusLabels: Record<string, string> = {
    scheduled: '예정',
    en_route: '이동중',
    checked_in: '도착',
    in_progress: '진행중',
    completed: '완료',
    cancelled: '취소',
    no_show: '미방문',
  };

  const counts = {
    scheduled: visits.filter((v: VisitSummary) => v.status === 'scheduled').length,
    in_progress: visits.filter((v: VisitSummary) =>
      ['en_route', 'checked_in', 'in_progress'].includes(v.status)
    ).length,
    completed: visits.filter((v: VisitSummary) => v.status === 'completed').length,
    cancelled: visits.filter((v: VisitSummary) =>
      ['cancelled', 'no_show'].includes(v.status)
    ).length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘의 일정</CardTitle>
        <div className="flex gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            예정 {counts.scheduled}
          </span>
          <span className="rounded-full bg-tertiary/10 px-3 py-1 text-xs font-semibold text-tertiary">
            진행중 {counts.in_progress}
          </span>
          <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            완료 {counts.completed}
          </span>
        </div>
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
      ) : visits.length === 0 ? (
        <p className="py-10 text-center text-sm text-on-surface-variant">
          오늘 예정된 방문이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {visits.map((visit: VisitSummary) => (
            <div
              key={visit.id}
              className="flex items-center justify-between rounded-xl bg-surface-container-low/50 px-4 py-3 transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                  <Clock className="h-3.5 w-3.5" />
                  {visit.scheduled_time
                    ? visit.scheduled_time.slice(0, 5)
                    : '--:--'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface">
                    <User className="h-3.5 w-3.5 text-on-surface-variant" />
                    {visit.patient_name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <MapPin className="h-3 w-3" />
                    담당: {visit.nurse_name}
                  </div>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(visit.status)}>
                {statusLabels[visit.status] || visit.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
