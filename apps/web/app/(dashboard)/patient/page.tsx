'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getProfile,
  getPatientsByGuardian,
  getVisitsByPatient,
  getLatestVitalsByPatients,
  getUnreadCount,
} from '@homecare/supabase-client';
import {
  formatDate,
  formatVisitStatus,
  formatServiceType,
  formatRelativeTime,
  getToday,
  getVitalStatus,
  getVitalStatusColor,
  getVitalStatusLabel,
  getVitalTypeLabel,
  getVitalUnit,
} from '@homecare/shared-utils';
import type { VitalRanges } from '@homecare/shared-utils';
import Link from 'next/link';
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Brain,
  ClipboardList,
  Sparkles,
  UserPlus,
  ChevronRight,
  Bell,
  Stethoscope,
  Phone,
  ArrowRight,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

export default function PatientDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // 현재 사용자 정보
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(supabase, userId!),
    enabled: !!userId,
  });

  // 보호자의 환자 목록
  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const patients = useMemo(
    () => patientLinks?.map((link) => link.patient).filter(Boolean) ?? [],
    [patientLinks],
  );

  const primaryPatient = patients[0];

  // 오늘의 방문
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['visits-today', primaryPatient?.id],
    queryFn: () => getVisitsByPatient(supabase, primaryPatient!.id, 50, 0),
    enabled: !!primaryPatient?.id,
  });

  const todayStr = getToday();
  const todayVisits = useMemo(
    () => visitsData?.data?.filter((v) => v.scheduled_date === todayStr) ?? [],
    [visitsData, todayStr],
  );

  const nextVisit = todayVisits.find((v) =>
    ['scheduled', 'en_route', 'checked_in', 'in_progress'].includes(v.status),
  );

  // 알림 수
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count', userId],
    queryFn: () => getUnreadCount(supabase, userId!),
    enabled: !!userId,
  });

  // 최신 바이탈
  const patientIds = useMemo(() => patients.map((p) => p!.id), [patients]);
  const { data: vitalsData } = useQuery({
    queryKey: ['vitals', patientIds],
    queryFn: () => getLatestVitalsByPatients(supabase, patientIds),
    enabled: patientIds.length > 0,
  });

  const latestVitals = vitalsData?.[0]?.vitals as Record<string, number> | undefined;
  const vitalsUpdatedAt = vitalsData?.[0]?.created_at as string | undefined;

  // 레드플래그 알림
  const { data: redFlags = [] } = useQuery({
    queryKey: ['patient-red-flags', primaryPatient?.id],
    queryFn: async () => {
      if (!primaryPatient?.id) return [];
      const { data } = await supabase
        .from('red_flag_alerts')
        .select('id, title, description, severity, created_at')
        .eq('patient_id', primaryPatient.id)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(3);
      return (data ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        severity: string;
        created_at: string;
      }>;
    },
    enabled: !!primaryPatient?.id,
  });

  // 다음 의사 방문
  const { data: nextDoctorVisit } = useQuery({
    queryKey: ['next-doctor-visit', primaryPatient?.id],
    queryFn: async () => {
      if (!primaryPatient?.id) return null;
      const { data } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, nurse:staff_profiles(user:profiles(full_name))')
        .eq('patient_id', primaryPatient.id)
        .eq('service_type', 'doctor_visit')
        .gte('scheduled_date', todayStr)
        .in('status', ['scheduled', 'en_route'])
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .single();
      return data as { id: string; scheduled_date: string; scheduled_time: string | null; nurse: any } | null;
    },
    enabled: !!primaryPatient?.id,
  });

  // 최근 방문 기록 (완료)
  const recentRecords = useMemo(
    () =>
      visitsData?.data
        ?.filter((v) => ['completed', 'checked_out'].includes(v.status))
        .slice(0, 4) ?? [],
    [visitsData],
  );

  // 매칭 상태 쿼리
  const { data: matchingStatus } = useQuery({
    queryKey: ['matching-status', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('service_requests')
        .select('id, status, created_at')
        .eq('guardian_id', userId)
        .eq('status', 'matching')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const vitalEntries: { key: keyof VitalRanges; icon: typeof Heart; label: string }[] = [
    { key: 'systolic_bp', icon: Heart, label: '혈압' },
    { key: 'heart_rate', icon: Activity, label: '심박수' },
    { key: 'temperature', icon: Thermometer, label: '체온' },
    { key: 'spo2', icon: Wind, label: '산소포화도' },
  ];

  const displayName = profile?.full_name ?? '보호자';

  // 헬스 스코어 계산 (간단한 버전)
  const healthScore = useMemo(() => {
    if (!latestVitals) return null;
    let score = 100;
    vitalEntries.forEach(({ key }) => {
      const value = latestVitals[key];
      if (value != null) {
        const status = getVitalStatus(key, value);
        if (status === 'warning') score -= 5;
        if (status === 'critical') score -= 15;
      }
    });
    return Math.max(0, Math.min(100, score));
  }, [latestVitals]);

  return (
    <div className="space-y-12 pb-8">
      {/* ── Hero Greeting (비대칭 12-col) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight mb-4 leading-tight">
            안녕하세요, {displayName}님
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
            {primaryPatient
              ? `${primaryPatient.full_name} 어르신의 평안한 하루를 위해 홈케어커넥트 AI가 실시간 모니터링 중입니다.`
              : '오늘의 케어 일정을 확인하세요.'}
          </p>
        </div>
        <div className="lg:col-span-4 flex justify-start lg:justify-end gap-3">
          <Link
            href="/patient/matching"
            className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
          >
            새 케어 요청
          </Link>
          <Link
            href="/patient/chat"
            className="p-3 bg-surface-container-low text-primary rounded-xl hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* ▸ 방문 예정 카드 (Next Visit) */}
        <div className="bento-card flex flex-col justify-between min-h-[320px]">
          {nextVisit ? (
            <>
              <div>
                <span className="inline-block bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
                  Next Visit
                </span>
                <h2 className="text-2xl font-bold text-primary mb-2">방문 예정 안내</h2>
                <p className="text-on-surface-variant text-sm mb-6">
                  {nextVisit.scheduled_time?.slice(0, 5) ?? '시간 미정'} ·{' '}
                  {(nextVisit as any).service_type
                    ? formatServiceType((nextVisit as any).service_type)
                    : '전문 간호 방문'}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-primary font-bold">
                    {(nextVisit.nurse as any)?.user?.full_name ?? '배정 대기'}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {formatVisitStatus(nextVisit.status)}
                  </p>
                </div>
                <button className="bg-white p-2.5 rounded-lg shadow-[0_2px_8px_rgba(46,71,110,0.08)] hover:shadow-md transition-shadow">
                  <Phone className="h-4 w-4 text-secondary" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Calendar className="h-12 w-12 text-on-surface-variant/20 mb-4" />
              <p className="font-semibold text-on-surface-variant mb-2">오늘 예정된 방문이 없습니다</p>
              <Link
                href="/patient/schedule"
                className="text-sm font-semibold text-secondary hover:underline"
              >
                일정 확인하기 →
              </Link>
            </div>
          )}
        </div>

        {/* ▸ AI Vitality Chart (2col span) */}
        <div className="bento-card col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-start z-10">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">AI Vitality Chart</h2>
              <p className="text-on-surface-variant text-sm">실시간 건강 상태 요약</p>
            </div>
            {healthScore !== null && (
              <div className="text-right">
                <p className="text-4xl font-black text-secondary">{healthScore}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Health Score</p>
              </div>
            )}
          </div>

          {/* 바이탈 바 차트 */}
          {latestVitals ? (
            <>
              <div className="mt-8 mb-4 flex items-end justify-between gap-2">
                {vitalEntries.map(({ key, label }) => {
                  const value = latestVitals[key];
                  if (value == null) return null;
                  const status = getVitalStatus(key, value);
                  const isNormal = status === 'normal';
                  const heightPercent = Math.min(95, Math.max(30, (value / 200) * 100));

                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className={`w-full rounded-t-lg relative group transition-colors ${
                          isNormal ? 'bg-surface-container-high' : 'bg-secondary'
                        }`}
                        style={{ height: `${heightPercent * 1.6}px` }}
                      >
                        {isNormal && (
                          <div className="absolute inset-0 bg-secondary/20 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-on-surface-variant">{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* AI 인사이트 메시지 */}
              <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-secondary shrink-0" />
                <p className="text-sm font-medium text-primary">
                  {healthScore !== null && healthScore >= 80
                    ? `오늘의 건강 점수는 ${healthScore}점입니다. 전반적으로 안정적인 상태입니다.`
                    : healthScore !== null
                      ? `오늘의 건강 점수는 ${healthScore}점입니다. 일부 수치에 주의가 필요합니다.`
                      : '건강 데이터를 분석 중입니다.'}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <Heart className="mx-auto h-10 w-10 text-on-surface-variant/20 mb-3" />
                <p className="text-sm text-on-surface-variant">건강 지표 데이터가 없습니다</p>
              </div>
            </div>
          )}
        </div>

        {/* ▸ Care Timeline (row-span-2) */}
        <div className="bento-card lg:row-span-2">
          <h2 className="text-xl font-bold text-primary mb-8">Care Timeline</h2>

          {recentRecords.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-on-surface-variant/20 mb-3" />
              <p className="text-sm text-on-surface-variant">방문 기록이 없습니다</p>
            </div>
          ) : (
            <div className="timeline-line space-y-8">
              {recentRecords.map((visit, idx) => {
                const isRecent = idx === 0;
                return (
                  <div key={visit.id} className="relative pl-10">
                    <div className="timeline-marker absolute left-0 top-1">
                      <div
                        className={`timeline-marker-dot ${
                          isRecent ? 'bg-secondary' : 'bg-outline-variant'
                        }`}
                      />
                    </div>
                    <p className={`text-xs font-bold mb-1 ${
                      isRecent ? 'text-secondary' : 'text-on-surface-variant'
                    }`}>
                      {formatRelativeTime(visit.scheduled_date)}
                    </p>
                    <p className="text-sm font-bold text-primary mb-1">
                      {(visit as any).service_type
                        ? formatServiceType((visit as any).service_type)
                        : '방문 간호'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {(visit.nurse as any)?.user?.full_name ?? '간호사'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/patient/records"
            className="block w-full mt-10 py-3 text-sm font-bold text-secondary text-center border-t border-surface-container-high pt-6 hover:text-primary transition-colors"
          >
            전체 기록 보기
          </Link>
        </div>

        {/* ▸ Matching Status */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary mb-2">Matching Status</h2>
            <p className="text-on-surface-variant text-sm mb-8">매칭 프로세스 진행 상황</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">
                    {matchingStatus ? '케어기버 매칭 중' : '매칭 대기'}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {matchingStatus ? 'AI가 최적 기관을 검색 중' : '새 매칭 요청을 시작하세요'}
                  </p>
                </div>
              </div>
            </div>

            {matchingStatus && (
              <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-2/3 rounded-full transition-all duration-1000" />
              </div>
            )}
          </div>

          <Link
            href="/patient/matching"
            className="mt-8 text-sm font-bold text-primary flex items-center justify-between group"
          >
            <span>매칭 상세보기</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ▸ Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/patient/matching"
            className="bento-card !p-6 flex flex-col items-center justify-center gap-3 hover:bg-white transition-all active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-primary">새 케어</span>
          </Link>

          <Link
            href="/patient/chat"
            className="bento-card !p-6 flex flex-col items-center justify-center gap-3 hover:bg-white transition-all active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-primary">AI 상담</span>
          </Link>

          <Link
            href="/patient/records"
            className="bento-card !p-6 col-span-2 flex items-center gap-4 px-6 hover:bg-white transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-bold text-primary flex-1">방문 기록 조회</span>
            <ChevronRight className="h-5 w-5 text-outline-variant group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── 레드플래그 경고 배너 ── */}
      {redFlags.length > 0 && (
        <section className="rounded-3xl bg-tertiary/5 p-8 border-l-8 border-tertiary-container">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-tertiary" />
            <h3 className="text-lg font-bold text-tertiary">긴급 주의 사항</h3>
          </div>
          <div className="space-y-3">
            {redFlags.map((flag) => (
              <div key={flag.id} className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                  <AlertTriangle className="h-5 w-5 text-error" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-primary">{flag.title}</h4>
                  {flag.description && (
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {flag.description}
                    </p>
                  )}
                </div>
                <Link
                  href="/patient/notifications"
                  className="shrink-0 text-xs font-bold text-secondary hover:underline"
                >
                  확인
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 알림 바로가기 ── */}
      {(unreadCount ?? 0) > 0 && (
        <Link
          href="/patient/notifications"
          className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-[0_10px_40px_rgba(46,71,110,0.06)] transition-all hover:shadow-[0_20px_60px_rgba(46,71,110,0.08)] group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10">
            <Bell className="h-5 w-5 text-tertiary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">읽지 않은 알림</p>
            <p className="text-xs text-on-surface-variant">{unreadCount}개의 새로운 알림이 있습니다</p>
          </div>
          <ChevronRight className="h-5 w-5 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
