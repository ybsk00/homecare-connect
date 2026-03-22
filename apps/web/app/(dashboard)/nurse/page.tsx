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
  Heart,
  Thermometer,
  Plus,
  CreditCard,
  ArrowRight,
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
        .select('id, title, severity, status, description, patient:patients(full_name)')
        .eq('nurse_id', staffInfo.id)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as Array<{
        id: string;
        title: string;
        severity: string;
        status: string;
        description: string | null;
        patient: { full_name: string };
      }>;
    },
    enabled: !!staffInfo?.id,
  });

  // 담당 환자 목록
  const { data: assignedPatients = [] } = useQuery({
    queryKey: ['nurse-assigned-patients', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select('patient:patients(id, full_name, care_grade)')
        .eq('nurse_id', staffInfo.id)
        .order('scheduled_date', { ascending: false })
        .limit(20);
      // 중복 환자 제거
      const uniquePatients = new Map();
      (data ?? []).forEach((v: any) => {
        if (v.patient && !uniquePatients.has(v.patient.id)) {
          uniquePatients.set(v.patient.id, v.patient);
        }
      });
      return Array.from(uniquePatients.values()).slice(0, 5) as Array<{
        id: string;
        full_name: string;
        care_grade: string | null;
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

  // 현재 진행 중인 방문 (LIVE)
  const liveVisit = visits.find((v) => ['checked_in', 'in_progress'].includes(v.status));
  // 다음 방문 (아직 시작 안 된 첫 번째)
  const nextPending = pendingVisits.find((v) => v.status === 'scheduled');
  // 히어로에 표시할 방문
  const heroVisit = liveVisit || nextPending;

  if (visitsLoading) return <Loading />;

  return (
    <div className="space-y-8 pb-8">
      {/* ── 헤더: Editorial 스타일 ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">오늘의 일정</h1>
          <p className="text-on-surface-variant font-medium">{todayDisplay}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
            <Calendar className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold">날짜 선택</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
            <MapPin className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold">지역 필터</span>
          </div>
        </div>
      </header>

      {/* ── 12-col Bento Grid ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ▸ LIVE Status 히어로 카드 (8col) */}
        <section className={clsx(
          'col-span-12 lg:col-span-8 rounded-3xl p-8 relative overflow-hidden',
          heroVisit
            ? 'bg-primary-container text-white shadow-2xl shadow-primary-container/30'
            : 'bg-surface-container-low'
        )}>
          {heroVisit ? (
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[240px]">
              {/* 상단: 상태 + 시간 */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-bold tracking-widest uppercase">
                    {liveVisit ? 'Visit in Progress' : 'Next Visit'}
                  </div>
                  {liveVisit && (
                    <div className="flex items-center gap-1.5 text-secondary-container">
                      <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                      <span className="text-xs font-bold">LIVE</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black">
                    {heroVisit.scheduled_time?.slice(0, 5) ?? '--:--'}
                  </div>
                  <div className="text-on-primary-container text-xs">
                    {heroVisit.estimated_duration_min
                      ? `예상 ${heroVisit.estimated_duration_min}분`
                      : ''}
                  </div>
                </div>
              </div>

              {/* 하단: 환자 정보 + 바이탈 */}
              <div className="mt-8 flex items-end justify-between flex-wrap gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md p-1 flex items-center justify-center">
                    <User className="h-10 w-10 text-white/70" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-1">{heroVisit.patient.full_name}</h2>
                    <p className="text-on-primary-container font-medium flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      {heroVisit.patient.address ?? '주소 미등록'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="glass-card-dark p-4 rounded-2xl min-w-[110px]">
                    <div className="flex items-center justify-between mb-2">
                      <Heart className="h-4 w-4 text-secondary" />
                      <span className="text-[10px] font-bold text-on-primary-container">심박수</span>
                    </div>
                    <div className="text-xl font-bold">-- <span className="text-xs font-normal">bpm</span></div>
                  </div>
                  <div className="glass-card-dark p-4 rounded-2xl min-w-[110px]">
                    <div className="flex items-center justify-between mb-2">
                      <Thermometer className="h-4 w-4 text-secondary" />
                      <span className="text-[10px] font-bold text-on-primary-container">체온</span>
                    </div>
                    <div className="text-xl font-bold">-- <span className="text-xs font-normal">°C</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-on-surface-variant/20 mb-4" />
              <p className="font-semibold text-on-surface-variant">오늘 예정된 방문이 없습니다</p>
            </div>
          )}

          {/* 배경 blur 장식 오브 */}
          {heroVisit && (
            <>
              <div className="blur-orb -right-20 -bottom-20 w-80 h-80 bg-secondary/20" />
              <div className="blur-orb-sm -left-10 -top-10 w-40 h-40 bg-on-primary-container/10" />
            </>
          )}
        </section>

        {/* ▸ Monthly Stats (4col) */}
        <section className="col-span-12 lg:col-span-4 bg-surface-container-low rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
              이번 달 성과 요약
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-on-surface font-medium">총 방문 횟수</span>
                  <span className="text-2xl font-black">{visits.length}회</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-1000"
                    style={{ width: visits.length > 0 ? `${Math.min(100, (completedVisits.length / visits.length) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center py-4 bg-white rounded-2xl px-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-secondary" />
                  </div>
                  <span className="text-sm font-bold">총 예상 시간</span>
                </div>
                <span className="text-lg font-bold">{totalDuration}분</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/nurse/stats')}
            className="w-full py-4 bg-surface-container-high rounded-xl text-primary font-bold text-sm hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 mt-6"
          >
            자세한 통계 보기
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        {/* ▸ 레드플래그 경고 섹션 (12col) */}
        {alerts.length > 0 && (
          <section className="col-span-12 bg-tertiary/5 rounded-3xl p-8 border-l-8 border-tertiary-container">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-tertiary" />
                <h3 className="text-xl font-bold text-tertiary">긴급 주의 환자 (AI 분석)</h3>
              </div>
              <span className="text-xs font-medium text-on-surface-variant">
                실시간 데이터 업데이트 완료
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {alerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="bg-white rounded-2xl p-6 flex gap-5 items-start shadow-sm">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                    <User className="h-7 w-7 text-on-surface-variant" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-lg text-primary">{alert.patient?.full_name}</span>
                      <span className={clsx(
                        'text-xs px-2 py-1 rounded-md font-bold',
                        alert.severity === 'red'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                      )}>
                        {alert.severity === 'red' ? '위험 단계' : '주의 요망'}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                      {alert.description ?? alert.title}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold bg-surface-container-highest px-2 py-0.5 rounded uppercase">
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded uppercase">
                        AI matched
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ▸ 방문 일정 리스트 (8col) */}
        <section className="col-span-12 lg:col-span-8 bento-card">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">오늘의 남은 방문</h3>
            <button
              onClick={() => router.push('/nurse/patients')}
              className="text-secondary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              전체 보기
            </button>
          </div>

          {visits.length === 0 ? (
            <div className="py-14 text-center">
              <Calendar className="mx-auto h-12 w-12 text-on-surface-variant/20" />
              <p className="mt-4 text-sm text-on-surface-variant">오늘 예정된 방문이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((visit) => {
                const isCompleted = visit.status === 'completed';
                const isLive = liveVisit?.id === visit.id;
                const isNext = nextPending?.id === visit.id && !liveVisit;

                return (
                  <div
                    key={visit.id}
                    className={clsx(
                      'group flex items-center justify-between p-5 rounded-2xl transition-colors duration-300',
                      isCompleted
                        ? 'opacity-50'
                        : 'hover:bg-surface-container-low'
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[60px]">
                        <div className={clsx(
                          'text-lg font-black',
                          isLive || isNext ? 'text-secondary' : 'text-primary'
                        )}>
                          {visit.scheduled_time?.slice(0, 5) ?? '--:--'}
                        </div>
                        <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
                          {visit.estimated_duration_min ?? '--'} min
                        </div>
                      </div>
                      <div className={clsx(
                        'w-[2px] h-10 transition-colors',
                        isLive ? 'bg-secondary' : 'bg-surface-container'
                      )} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-primary">{visit.patient.full_name}</span>
                          {(isLive || isNext) && (
                            <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                              {isLive ? 'LIVE' : 'NEXT'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          {visit.patient.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {visit.patient.address.split(' ').slice(0, 3).join(' ')}
                            </span>
                          )}
                          {visit.patient.primary_diagnosis && (
                            <span className="flex items-center gap-1 font-semibold text-secondary">
                              {visit.patient.primary_diagnosis}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 우측 액션 */}
                    <div className="flex items-center gap-3">
                      {visit.status === 'scheduled' && (isLive || isNext) && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/nurse/visit/${visit.id}`)}
                        >
                          <Navigation className="h-4 w-4" />
                          방문 시작
                        </Button>
                      )}
                      {visit.status === 'scheduled' && !isNext && !isLive && (
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
                      <ChevronRight className="h-5 w-5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ▸ 담당 환자 현황 (4col) */}
        <section className="col-span-12 lg:col-span-4 bento-card">
          <h3 className="text-xl font-bold mb-8">담당 환자 현황</h3>
          <div className="space-y-5">
            {assignedPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between cursor-pointer hover:bg-surface-container-low rounded-xl p-2 -mx-2 transition-colors"
                onClick={() => router.push(`/nurse/patients/${patient.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                    <User className="h-5 w-5 text-on-surface-variant" />
                  </div>
                  <span className="text-sm font-bold">{patient.full_name}</span>
                </div>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full">
                  {patient.care_grade ? `${patient.care_grade}등급` : '정상'}
                </span>
              </div>
            ))}

            {assignedPatients.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-6">
                담당 환자가 없습니다
              </p>
            )}
          </div>

          <button
            onClick={() => router.push('/nurse/patients')}
            className="w-full mt-8 pt-6 border-t border-surface-container-high text-sm font-bold text-secondary hover:text-primary transition-colors text-center"
          >
            전체 환자 보기
          </button>
        </section>
      </div>

      {/* ── FAB (Floating Action Button) ── */}
      <button
        onClick={() => {
          const next = pendingVisits[0];
          if (next) router.push(`/nurse/visit/${next.id}`);
        }}
        className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-2xl shadow-primary/30 flex items-center justify-center group active:scale-90 transition-transform z-40"
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
}
