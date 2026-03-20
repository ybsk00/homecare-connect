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
        .slice(0, 5) ?? [],
    [visitsData],
  );

  const vitalEntries: { key: keyof VitalRanges; icon: typeof Heart; label: string }[] = [
    { key: 'systolic_bp', icon: Heart, label: '혈압' },
    { key: 'heart_rate', icon: Activity, label: '심박수' },
    { key: 'temperature', icon: Thermometer, label: '체온' },
    { key: 'spo2', icon: Wind, label: '산소포화도' },
  ];

  const quickMenuItems = [
    { label: '매칭 요청', href: '/patient/matching', icon: Brain, desc: 'AI 기관 매칭' },
    { label: '방문 기록', href: '/patient/records', icon: ClipboardList, desc: '치료 이력 확인' },
    { label: 'AI 상담', href: '/patient/chat', icon: Sparkles, desc: '제도·비용 상담' },
    { label: '환자 등록', href: '/patient/patients', icon: UserPlus, desc: '환자 정보 관리' },
  ];

  const displayName = profile?.full_name ?? '보호자';

  return (
    <div className="space-y-10 pb-8">
      {/* ── 인사말 섹션 ── */}
      <section className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">
          안녕하세요, {displayName}님
        </h1>
        <p className="text-on-surface-variant">
          오늘의 케어 일정을 확인하세요.
        </p>
      </section>

      {/* ── 히어로: 오늘의 방문 카드 ── */}
      <section className="relative group">
        {nextVisit ? (
          <>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary-container blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary-container p-6 text-white shadow-lg">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-primary-container">
                    Today&apos;s Visit
                  </span>
                  <h2 className="mt-3 text-2xl font-bold">
                    {(nextVisit as any).service_type
                      ? formatServiceType((nextVisit as any).service_type)
                      : '방문 간호 서비스'}
                  </h2>
                </div>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-sm font-bold text-on-secondary-container">
                  {formatVisitStatus(nextVisit.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <p className="mb-1 text-xs font-semibold text-on-primary-container">담당 간호사</p>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-secondary-container" />
                    <span className="text-lg font-bold">
                      {(nextVisit.nurse as any)?.user?.full_name ?? '배정 대기'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <p className="mb-1 text-xs font-semibold text-on-primary-container">방문 예정 시간</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-secondary-container" />
                    <span className="text-lg font-bold">
                      {nextVisit.scheduled_time?.slice(0, 5) ?? '시간 미정'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-on-surface-variant/30" />
            <p className="mt-4 font-semibold text-on-surface-variant">
              오늘 예정된 방문이 없습니다
            </p>
            <Link
              href="/patient/schedule"
              className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline"
            >
              일정 확인하기 →
            </Link>
          </div>
        )}
      </section>

      {/* ── 건강 지표 + 다음 검진 (벤토 그리드) ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 건강 지표 카드 */}
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">최근 건강 지표</h3>
            {vitalsUpdatedAt && (
              <span className="text-xs text-on-surface-variant">
                {formatRelativeTime(vitalsUpdatedAt)} 업데이트
              </span>
            )}
          </div>
          {latestVitals ? (
            <div className="space-y-3">
              {vitalEntries.map(({ key, icon: Icon, label }) => {
                const value = latestVitals[key];
                if (value == null) return null;
                const status = getVitalStatus(key, value);
                const statusColor = getVitalStatusColor(status);
                const statusLabel = getVitalStatusLabel(status);

                // 혈압은 수축기/이완기 함께 표시
                const displayValue =
                  key === 'systolic_bp' && latestVitals['diastolic_bp'] != null
                    ? `${value}/${latestVitals['diastolic_bp']}`
                    : String(value);

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl bg-surface-container-low p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
                        <p className="text-lg font-bold text-on-surface">
                          {displayValue}{' '}
                          <span className="text-sm font-normal text-on-surface-variant">
                            {getVitalUnit(key)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Heart className="mx-auto h-10 w-10 text-on-surface-variant/20" />
              <p className="mt-3 text-sm text-on-surface-variant">건강 지표 데이터가 없습니다</p>
            </div>
          )}
        </div>

        {/* 다음 정기 검진 카드 */}
        <div className="flex flex-col justify-between rounded-2xl bg-surface-container-low p-6">
          <div>
            <h3 className="mb-4 text-lg font-bold text-primary">다음 정기 검진</h3>
            {nextDoctorVisit ? (
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-surface-container-lowest shadow-sm">
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {new Date(nextDoctorVisit.scheduled_date).toLocaleDateString('ko-KR', { month: 'short' })}
                  </span>
                  <span className="text-xl font-extrabold text-primary">
                    {new Date(nextDoctorVisit.scheduled_date).getDate()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">의사 방문 진료</p>
                  <p className="text-sm text-on-surface-variant">
                    {nextDoctorVisit.scheduled_time?.slice(0, 5) ?? '시간 미정'}
                    {nextDoctorVisit.nurse?.user?.full_name && ` · ${nextDoctorVisit.nurse.user.full_name}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-lowest">
                  <Stethoscope className="h-6 w-6 text-on-surface-variant/40" />
                </div>
                <div>
                  <p className="font-medium text-on-surface-variant">예정된 검진이 없습니다</p>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/patient/schedule"
            className="block w-full rounded-xl bg-surface-container-lowest py-3 text-center text-sm font-bold text-primary transition-colors hover:bg-white"
          >
            예정된 일정 전체보기
          </Link>
        </div>
      </section>

      {/* ── 레드플래그 경고 배너 ── */}
      {redFlags.length > 0 && (
        <section className="rounded-2xl bg-error/5 p-5">
          {redFlags.map((flag) => (
            <div key={flag.id} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-error">{flag.title}</h4>
                {flag.description && (
                  <p className="mt-1 text-xs leading-relaxed text-error/80">
                    {flag.description}
                  </p>
                )}
              </div>
              <Link
                href="/patient/notifications"
                className="shrink-0 text-xs font-bold text-error underline"
              >
                확인
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* ── 최근 케어 기록 타임라인 ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">최근 케어 기록</h3>
          <Link
            href="/patient/records"
            className="flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
          >
            전체보기 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentRecords.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-low p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">방문 기록이 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {recentRecords.map((visit, idx) => (
              <div
                key={visit.id}
                className={`flex items-start gap-4 rounded-xl bg-surface-container-low p-4 ${
                  idx === 0 ? 'border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">
                    {(visit as any).service_type
                      ? formatServiceType((visit as any).service_type)
                      : '방문 간호'}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {(visit.nurse as any)?.user?.full_name ?? '간호사'} ·{' '}
                    {formatDate(visit.scheduled_date)}
                  </p>
                  {(visit.visit_record as any)?.nurse_note && (
                    <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant/70">
                      {(visit.visit_record as any).nurse_note}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-on-surface-variant">
                  {formatRelativeTime(visit.scheduled_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 빠른 메뉴 ── */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-primary">빠른 메뉴</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-container p-5 text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold">{item.label}</span>
                <p className="mt-0.5 text-[10px] text-white/60">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 알림 바로가기 (미읽음이 있을 때) ── */}
      {(unreadCount ?? 0) > 0 && (
        <Link
          href="/patient/notifications"
          className="flex items-center gap-3 rounded-2xl bg-tertiary/5 p-4 transition-colors hover:bg-tertiary/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary/10">
            <Bell className="h-5 w-5 text-tertiary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">읽지 않은 알림</p>
            <p className="text-xs text-on-surface-variant">{unreadCount}개의 새로운 알림이 있습니다</p>
          </div>
          <ChevronRight className="h-5 w-5 text-on-surface-variant" />
        </Link>
      )}
    </div>
  );
}
