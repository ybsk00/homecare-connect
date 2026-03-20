'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  PlayCircle,
  Timer,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';

const statusLabels: Record<string, string> = {
  scheduled: '예정',
  en_route: '이동중',
  checked_in: '체크인',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
  no_show: '미방문',
};

export default function DashboardPage() {
  const { profile, staffInfo } = useAppStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // Today's visits
  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['nurse-visits-today', staffInfo?.id, today],
    queryFn: async () => {
      if (!staffInfo?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          estimated_duration_min,
          status,
          patient:patients(id, full_name, care_grade, primary_diagnosis, address)
        `)
        .eq('nurse_id', staffInfo.id)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_time', { ascending: true });
      return (data ?? []) as Array<{
        id: string;
        scheduled_date: string;
        scheduled_time: string | null;
        estimated_duration_min: number | null;
        status: string;
        patient: {
          id: string;
          full_name: string;
          care_grade: string | null;
          primary_diagnosis: string | null;
          address: string | null;
        };
      }>;
    },
    enabled: !!staffInfo?.id,
  });

  // Red flag alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['nurse-red-flags', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('red_flag_alerts')
        .select('id, title, severity, status, patient:patients(full_name)')
        .eq('nurse_id', staffInfo.id)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        title: string;
        severity: string;
        status: string;
        patient: { full_name: string };
      }>;
    },
    enabled: !!staffInfo?.id,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_in',
          checkin_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-visits-today'] });
    },
  });

  const completedVisits = visits.filter((v) => v.status === 'completed');
  const pendingVisits = visits.filter((v) => v.status !== 'completed' && v.status !== 'cancelled' && v.status !== 'no_show');
  const totalDuration = visits.reduce((sum, v) => sum + (v.estimated_duration_min ?? 0), 0);

  const displayName = profile?.full_name || '간호사';

  if (visitsLoading) return <Loading />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          오늘 일정
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          안녕하세요, {displayName}님. {todayDisplay}
        </p>
      </div>

      {/* Red flag alert banner */}
      {alerts.length > 0 && (
        <div
          className="cursor-pointer rounded-2xl bg-gradient-to-r from-error/10 to-error/5 p-5"
          onClick={() => router.push('/dashboard/alerts')}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/15">
              <AlertTriangle className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-sm font-semibold text-error">
                레드플래그 알림 {alerts.length}건
              </p>
              <p className="text-xs text-error/70">
                {alerts[0]?.patient?.full_name} 환자 - {alerts[0]?.title}
                {alerts.length > 1 && ` 외 ${alerts.length - 1}건`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="완료"
          value={completedVisits.length}
          iconBg="bg-secondary/10 text-secondary"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="잔여"
          value={pendingVisits.length}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<Timer className="h-5 w-5" />}
          label="총 예상 시간"
          value={`${totalDuration}분`}
          iconBg="bg-tertiary/10 text-tertiary"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="전체 방문"
          value={visits.length}
          iconBg="bg-secondary/10 text-secondary"
        />
      </div>

      {/* Visit list */}
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-on-surface-variant" />
            <h3 className="text-lg font-semibold text-on-surface">방문 목록</h3>
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              showCompleted
                ? 'bg-secondary/10 text-secondary'
                : 'bg-surface-container-high text-on-surface-variant'
            )}
          >
            {showCompleted ? '완료 숨기기' : '완료 표시'}
          </button>
        </div>

        {visits.length === 0 ? (
          <div className="py-14 text-center">
            <Calendar className="mx-auto h-12 w-12 text-on-surface-variant/30" />
            <p className="mt-4 text-sm text-on-surface-variant">
              오늘 예정된 방문이 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits
              .filter((v) => showCompleted || (v.status !== 'completed' && v.status !== 'cancelled'))
              .map((visit) => (
                <div
                  key={visit.id}
                  className={clsx(
                    'flex items-center justify-between rounded-2xl p-5 transition-all',
                    visit.status === 'completed'
                      ? 'bg-surface-container-low/50'
                      : 'bg-surface-container-low hover:bg-surface-container-high/50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Time */}
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-white">
                      <span className="text-xs text-on-surface-variant">
                        {visit.scheduled_time?.slice(0, 5) || '--:--'}
                      </span>
                      {visit.estimated_duration_min && (
                        <span className="text-[10px] text-on-surface-variant/60">
                          {visit.estimated_duration_min}분
                        </span>
                      )}
                    </div>

                    {/* Patient info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-on-surface">
                          {visit.patient.full_name}
                        </p>
                        {visit.patient.care_grade && (
                          <Badge variant="primary">
                            {visit.patient.care_grade}등급
                          </Badge>
                        )}
                        <Badge variant={getStatusBadgeVariant(visit.status)}>
                          {statusLabels[visit.status] || visit.status}
                        </Badge>
                      </div>
                      {visit.patient.primary_diagnosis && (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {visit.patient.primary_diagnosis}
                        </p>
                      )}
                      {visit.patient.address && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant/70">
                          <MapPin className="h-3 w-3" />
                          {visit.patient.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {visit.status === 'scheduled' && (
                      <Button
                        size="sm"
                        loading={checkInMutation.isPending}
                        onClick={() => checkInMutation.mutate(visit.id)}
                      >
                        <PlayCircle className="h-4 w-4" />
                        체크인
                      </Button>
                    )}
                    {(visit.status === 'checked_in' || visit.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/dashboard/visit/${visit.id}`)}
                      >
                        기록 작성
                      </Button>
                    )}
                    {visit.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/visit/${visit.id}`)}
                      >
                        상세 보기
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
