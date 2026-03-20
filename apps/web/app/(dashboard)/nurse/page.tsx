'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  PlayCircle,
  Navigation,
  Route,
  ChevronRight,
  Calendar,
  User,
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

export default function NurseDashboardPage() {
  const { profile, staffInfo } = useAppStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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
  const pendingVisits = visits.filter(
    (v) => v.status !== 'completed' && v.status !== 'cancelled' && v.status !== 'no_show',
  );
  const totalDuration = visits.reduce((sum, v) => sum + (v.estimated_duration_min ?? 0), 0);
  const displayName = profile?.full_name || '간호사';

  // 다음 방문 (아직 완료 안 된 첫 번째)
  const nextPending = pendingVisits[0];

  if (visitsLoading) return <Loading />;

  return (
    <div className="space-y-8 pb-8">
      {/* ── 헤더: 날짜 + 완료/잔여 칩 ── */}
      <section>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="font-medium text-on-surface-variant">{todayDisplay}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              오늘의 방문 일정
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
              완료 {completedVisits.length}
            </span>
            <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
              잔여 {pendingVisits.length}
            </span>
          </div>
        </div>
      </section>

      {/* ── 벤토 그리드: 지도 + 이동 통계 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 지도 영역 */}
        <div className="relative flex h-48 items-end overflow-hidden rounded-xl bg-surface-container-low md:col-span-2">
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto h-10 w-10 text-on-surface-variant/30" />
              <p className="mt-2 text-sm text-on-surface-variant">
                {visits.length > 0
                  ? `오늘 ${visits.length}곳 방문 예정`
                  : '방문 예정지가 없습니다'}
              </p>
            </div>
          </div>
          {/* 방문지 마커 오버레이 */}
          {visits.length > 0 && (
            <div className="absolute bottom-3 left-3 rounded-lg bg-surface-container-lowest/90 px-3 py-1.5 text-xs font-bold text-primary backdrop-blur">
              방문 {visits.length}건 · 총 {totalDuration}분 예상
            </div>
          )}
        </div>

        {/* 이동 통계 카드 */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-primary-container p-5 text-on-primary-container">
          <div className="relative z-10">
            <p className="text-sm font-semibold text-on-primary-container/70">총 예상 시간</p>
            <h2 className="text-3xl font-bold">{totalDuration}분</h2>
          </div>
          <div className="relative z-10 mt-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-secondary-container" />
            <span className="text-xs font-medium">
              {visits.length}건 방문 · {completedVisits.length}건 완료
            </span>
          </div>
          {/* 장식 */}
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        </div>
      </section>

      {/* ── 레드플래그 경고 배너 ── */}
      {alerts.length > 0 && (
        <section
          className="cursor-pointer rounded-2xl bg-error/5 p-5"
          onClick={() => router.push('/nurse/alerts')}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/15">
              <AlertTriangle className="h-5 w-5 text-error" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-error">
                레드플래그 알림 {alerts.length}건
              </p>
              <p className="text-xs text-error/70">
                {alerts[0]?.patient?.full_name} 환자 - {alerts[0]?.title}
                {alerts.length > 1 && ` 외 ${alerts.length - 1}건`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-error/50" />
          </div>
        </section>
      )}

      {/* ── 방문 리스트 ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-primary">
              {nextPending ? '다음 방문 예정' : '오늘 방문'}
            </h3>
            {nextPending && (
              <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-secondary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                LIVE
              </span>
            )}
          </div>
        </div>

        {visits.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-low py-14 text-center">
            <Calendar className="mx-auto h-12 w-12 text-on-surface-variant/30" />
            <p className="mt-4 text-sm text-on-surface-variant">
              오늘 예정된 방문이 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => {
              const isNext =
                nextPending?.id === visit.id &&
                !['completed', 'cancelled'].includes(visit.status);
              const isCompleted = visit.status === 'completed';

              return (
                <div
                  key={visit.id}
                  className={clsx(
                    'rounded-2xl p-5 transition-all',
                    isNext
                      ? 'bg-surface-container-lowest shadow-[0_10px_40px_rgba(24,28,30,0.05)]'
                      : isCompleted
                        ? 'bg-surface-container-low/50 opacity-70'
                        : 'bg-surface-container-low hover:bg-surface-container-high/50',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* 아바타 */}
                      <div
                        className={clsx(
                          'flex h-12 w-12 items-center justify-center rounded-full',
                          isCompleted
                            ? 'bg-secondary/10'
                            : isNext
                              ? 'bg-primary/10'
                              : 'bg-surface-container-high',
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-secondary" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      {/* 환자 정보 */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-on-surface">
                            {visit.patient.full_name}
                          </p>
                          {visit.patient.care_grade && (
                            <Badge variant="primary">{visit.patient.care_grade}등급</Badge>
                          )}
                          <Badge variant={getStatusBadgeVariant(visit.status)}>
                            {statusLabels[visit.status] || visit.status}
                          </Badge>
                        </div>
                        {visit.patient.address && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
                            <MapPin className="h-3 w-3" />
                            {visit.patient.address}
                          </p>
                        )}
                        {visit.patient.primary_diagnosis && (
                          <p className="mt-0.5 text-xs text-on-surface-variant/70">
                            {visit.patient.primary_diagnosis}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 우측: 시간 + 액션 */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-on-surface">
                          {visit.scheduled_time?.slice(0, 5) || '--:--'}
                        </p>
                        {visit.estimated_duration_min && (
                          <p className="text-[10px] text-on-surface-variant">
                            {visit.estimated_duration_min}분
                          </p>
                        )}
                      </div>

                      {visit.status === 'scheduled' && isNext && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/nurse/visit/${visit.id}`)}
                        >
                          <Navigation className="h-4 w-4" />
                          방문 시작
                        </Button>
                      )}
                      {visit.status === 'scheduled' && !isNext && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => checkInMutation.mutate(visit.id)}
                          loading={checkInMutation.isPending}
                        >
                          <PlayCircle className="h-4 w-4" />
                          체크인
                        </Button>
                      )}
                      {(visit.status === 'checked_in' || visit.status === 'in_progress') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/nurse/visit/${visit.id}`)}
                        >
                          기록 작성
                        </Button>
                      )}
                      {visit.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/nurse/visit/${visit.id}`)}
                        >
                          상세
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 하루 요약 ── */}
      {visits.length > 0 && (
        <section className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="mb-3 text-sm font-bold text-on-surface-variant uppercase tracking-wider">
            하루 요약
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{completedVisits.length}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">완료</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{visits.length}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">전체</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{totalDuration}분</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">총 예상 시간</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
