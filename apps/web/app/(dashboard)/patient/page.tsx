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
  formatCareGrade,
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

export default function DashboardPage() {
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

  const scheduledCount = todayVisits.filter((v) => ['scheduled', 'en_route'].includes(v.status)).length;
  const inProgressCount = todayVisits.filter((v) => ['checked_in', 'in_progress'].includes(v.status)).length;
  const completedCount = todayVisits.filter((v) => ['completed', 'checked_out'].includes(v.status)).length;

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

  // 최근 방문 기록 (완료된 것)
  const recentRecords = useMemo(
    () =>
      visitsData?.data
        ?.filter((v) => ['completed', 'checked_out'].includes(v.status))
        .slice(0, 3) ?? [],
    [visitsData],
  );

  const quickMenuItems = [
    { label: '매칭 요청', href: '/matching', icon: BrainIcon, color: 'from-[#006A63] to-[#004D47]' },
    { label: '방문 기록', href: '/records', icon: ClipboardIcon, color: 'from-[#002045] to-[#001530]' },
    { label: 'AI 상담', href: '/ai-report', icon: SparklesIcon, color: 'from-[#4A2080] to-[#321560]' },
    { label: '환자 등록', href: '/patients', icon: UserPlusIcon, color: 'from-[#321B00] to-[#201000]' },
  ];

  const vitalKeys: (keyof VitalRanges)[] = ['systolic_bp', 'heart_rate', 'temperature', 'spo2'];

  return (
    <div className="space-y-8">
      {/* 인사말 */}
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">
          안녕하세요, {profile?.full_name ?? '보호자'}님
        </h1>
        <p className="mt-1 text-[#002045]/60">
          오늘도 소중한 분의 건강을 함께 지켜드리겠습니다
        </p>
      </div>

      {/* 퀵 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="오늘 방문 예정"
          value={scheduledCount}
          bg="bg-[#002045]/5"
          textColor="text-[#002045]"
          loading={visitsLoading}
        />
        <StatCard
          label="진행 중"
          value={inProgressCount}
          bg="bg-[#006A63]/5"
          textColor="text-[#006A63]"
          loading={visitsLoading}
        />
        <StatCard
          label="완료"
          value={completedCount}
          bg="bg-[#22C55E]/5"
          textColor="text-[#22C55E]"
          loading={visitsLoading}
        />
        <StatCard
          label="알림"
          value={unreadCount ?? 0}
          bg="bg-[#321B00]/5"
          textColor="text-[#321B00]"
          loading={false}
        />
      </div>

      {/* 오늘의 방문 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#002045]">오늘의 방문</h2>
        {todayVisits.length === 0 ? (
          <div className="rounded-2xl bg-[#002045]/5 p-8 text-center">
            <p className="text-[#002045]/40">오늘 예정된 방문이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayVisits.map((visit) => (
              <div
                key={visit.id}
                className="rounded-2xl bg-gradient-to-r from-[#002045] to-[#003060] p-5 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">담당 간호사</p>
                    <p className="text-lg font-semibold">
                      {(visit.nurse as any)?.user?.full_name ?? '배정 대기'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      visit.status === 'completed' || visit.status === 'checked_out'
                        ? 'bg-[#22C55E]/20 text-[#22C55E]'
                        : visit.status === 'in_progress' || visit.status === 'checked_in'
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                          : 'bg-white/20 text-white'
                    }`}
                  >
                    {formatVisitStatus(visit.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
                  <span>{visit.scheduled_time ?? '시간 미정'}</span>
                  <span>{(visit as any).service_type ? formatServiceType((visit as any).service_type) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 건강 지표 */}
      {latestVitals && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#002045]">건강 지표</h2>
          <div className="grid grid-cols-2 gap-3">
            {vitalKeys.map((key) => {
              const value = latestVitals[key];
              if (value == null) return null;
              const status = getVitalStatus(key, value);
              const statusColor = getVitalStatusColor(status);
              return (
                <div
                  key={key}
                  className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <p className="text-sm text-[#002045]/50">{getVitalTypeLabel(key)}</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-2xl font-bold text-[#002045]">{value}</span>
                    <span className="mb-0.5 text-sm text-[#002045]/40">{getVitalUnit(key)}</span>
                  </div>
                  <span
                    className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                    }}
                  >
                    {getVitalStatusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 최근 방문 기록 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#002045]">최근 방문 기록</h2>
          <Link href="/records" className="text-sm text-[#006A63] hover:underline">
            전체 보기
          </Link>
        </div>
        {recentRecords.length === 0 ? (
          <div className="rounded-2xl bg-[#002045]/5 p-8 text-center">
            <p className="text-[#002045]/40">방문 기록이 없습니다</p>
          </div>
        ) : (
          <div className="relative space-y-0 pl-6">
            {/* 타임라인 세로선 */}
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-[#006A63]/20" />
            {recentRecords.map((visit) => (
              <div key={visit.id} className="relative pb-4">
                {/* 타임라인 점 */}
                <div className="absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#006A63]" />
                <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#002045]">
                      {formatDate(visit.scheduled_date)}
                    </p>
                    <span className="text-xs text-[#002045]/50">
                      {formatVisitStatus(visit.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#002045]/60">
                    {(visit.nurse as any)?.user?.full_name ?? '간호사'} ·{' '}
                    {(visit as any).service_type ? formatServiceType((visit as any).service_type) : ''}
                  </p>
                  {(visit.visit_record as any)?.nurse_note && (
                    <p className="mt-2 line-clamp-2 text-xs text-[#002045]/50">
                      {(visit.visit_record as any).nurse_note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 빠른 메뉴 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#002045]">빠른 메뉴</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br ${item.color} p-5 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              <item.icon className="h-7 w-7" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── 통계 카드 ────────────────────────────────── */
function StatCard({
  label,
  value,
  bg,
  textColor,
  loading,
}: {
  label: string;
  value: number;
  bg: string;
  textColor: string;
  loading: boolean;
}) {
  return (
    <div className={`rounded-2xl ${bg} p-5`}>
      <p className="text-sm text-[#002045]/60">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-12 animate-pulse rounded-lg bg-[#002045]/10" />
      ) : (
        <p className={`mt-2 text-3xl font-bold ${textColor}`}>{value}</p>
      )}
    </div>
  );
}

/* ── 아이콘 ────────────────────────────────── */
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47-2.47M5 14.5l2.47-2.47m0 0a3 3 0 0 0 4.5 0m-4.5 0a3 3 0 0 1 4.5 0m0 0L12 17.25m0 0L9.53 14.53M12 17.25l2.47-2.72" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
  );
}
