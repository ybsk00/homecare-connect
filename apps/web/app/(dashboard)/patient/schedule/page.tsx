'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getPatientsByGuardian, getVisitsByPatient } from '@homecare/supabase-client';
import {
  formatVisitStatus,
  formatServiceType,
  getWeekRange,
  getMonthRange,
  toDateString,
  addDays,
  getVisitDayLabel,
  isToday,
  formatDateWithDay,
} from '@homecare/shared-utils';

type ViewMode = 'week' | 'month';

const VISIT_STEPS = [
  { key: 'scheduled', label: '예정' },
  { key: 'en_route', label: '이동중' },
  { key: 'checked_in', label: '도착' },
  { key: 'in_progress', label: '수행중' },
  { key: 'completed', label: '완료' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'scheduled': return 0;
    case 'en_route': return 1;
    case 'checked_in': return 2;
    case 'in_progress': return 3;
    case 'completed':
    case 'checked_out': return 4;
    default: return -1;
  }
}

export default function SchedulePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const primaryPatient = patientLinks?.[0]?.patient;

  // 주간 날짜 계산
  const baseDate = useMemo(() => addDays(new Date(), weekOffset * 7), [weekOffset]);
  const weekRange = useMemo(() => getWeekRange(baseDate), [baseDate]);

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(weekRange.start);
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i));
    }
    return dates;
  }, [weekRange]);

  // 월간 날짜 계산
  const monthBaseDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthRange = useMemo(() => getMonthRange(monthBaseDate), [monthBaseDate]);

  const monthCalendarDates = useMemo(() => {
    const firstDay = new Date(monthRange.start);
    const lastDay = new Date(monthRange.end);
    const startDow = firstDay.getDay(); // 0=Sun
    const dates: (Date | null)[] = [];
    // pad start
    for (let i = 0; i < startDow; i++) dates.push(null);
    const d = new Date(firstDay);
    while (d <= lastDay) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    // pad end to fill row
    while (dates.length % 7 !== 0) dates.push(null);
    return dates;
  }, [monthRange]);

  const monthYear = useMemo(() => {
    const y = monthBaseDate.getFullYear();
    const m = monthBaseDate.getMonth() + 1;
    return `${y}년 ${m}월`;
  }, [monthBaseDate]);

  // 방문 데이터
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['visits-all', primaryPatient?.id],
    queryFn: () => getVisitsByPatient(supabase, primaryPatient!.id, 200, 0),
    enabled: !!primaryPatient?.id,
  });

  const allVisits = visitsData?.data ?? [];
  const visitsByDate = useMemo(() => {
    const map = new Map<string, typeof allVisits>();
    for (const v of allVisits) {
      const dateKey = v.scheduled_date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(v);
    }
    return map;
  }, [allVisits]);

  const selectedVisits = visitsByDate.get(selectedDate) ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'checked_out':
        return 'bg-secondary/10 text-secondary';
      case 'in_progress':
      case 'checked_in':
        return 'bg-tertiary-100 text-tertiary';
      case 'cancelled':
      case 'no_show':
        return 'bg-error-container text-error';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            일정
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">일정</h1>
          <p className="mt-2 text-base text-on-surface-variant">방문 일정을 확인하세요</p>
        </div>

        {/* 주간/월간 토글 - pill switcher */}
        <div className="flex rounded-2xl bg-surface-container-low p-1.5">
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              viewMode === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-[0_10px_40px_rgba(46,71,110,0.06)]'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              viewMode === 'month'
                ? 'bg-surface-container-lowest text-primary shadow-[0_10px_40px_rgba(46,71,110,0.06)]'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {/* 주간 캘린더 */}
      {viewMode === 'week' && (
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          {/* 주간 네비게이션 */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-2xl bg-surface-container-low p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <p className="text-sm font-bold tracking-wide text-primary">
              {weekRange.start.replace(/-/g, '.')} ~ {weekRange.end.replace(/-/g, '.')}
            </p>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-2xl bg-surface-container-low p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* 요일 그리드 */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dateStr = toDateString(date);
              const isSelected = dateStr === selectedDate;
              const today = isToday(date);
              const hasVisits = visitsByDate.has(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`group flex flex-col items-center gap-1.5 rounded-2xl py-4 transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[0_8px_24px_rgba(0,32,69,0.25)]'
                      : today
                        ? 'bg-secondary/8 text-secondary hover:bg-secondary/15'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {getVisitDayLabel(date.getDay())}
                  </span>
                  <span className="text-2xl font-bold tracking-tight">{date.getDate()}</span>
                  {hasVisits && (
                    <div className="flex items-center justify-center">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' : 'bg-secondary shadow-[0_0_6px_rgba(0,106,99,0.3)]'
                        }`}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 월간 캘린더 */}
      {viewMode === 'month' && (
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          {/* 월간 네비게이션 */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="rounded-2xl bg-surface-container-low p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <p className="text-base font-bold tracking-wide text-primary">{monthYear}</p>
            <button
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="rounded-2xl bg-surface-container-low p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {monthCalendarDates.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="py-3" />;
              }
              const dateStr = toDateString(date);
              const isSelected = dateStr === selectedDate;
              const today = isToday(date);
              const hasVisits = visitsByDate.has(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`group relative flex flex-col items-center gap-1 rounded-2xl py-3 transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[0_6px_20px_rgba(0,32,69,0.2)]'
                      : today
                        ? 'bg-secondary/8 text-secondary hover:bg-secondary/15'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="text-sm font-bold">{date.getDate()}</span>
                  {hasVisits && (
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' : 'bg-secondary shadow-[0_0_6px_rgba(0,106,99,0.3)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 선택된 날짜 방문 목록 */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
            <div className="h-2.5 w-2.5 rounded-full bg-secondary" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-primary">
            {formatDateWithDay(selectedDate)}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-primary/5" />
            ))}
          </div>
        ) : selectedVisits.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest p-16 text-center shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5">
              <svg
                className="h-10 w-10 text-primary/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <p className="mt-6 text-base font-bold text-primary">
              예정된 방문이 없습니다
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              이 날짜에는 아직 방문 일정이 잡혀있지 않습니다
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedVisits.map((visit) => {
              const stepIdx = getStepIndex(visit.status);
              const isCancelled = visit.status === 'cancelled' || visit.status === 'no_show';

              return (
                <div
                  key={visit.id}
                  className="group overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_10px_40px_rgba(46,71,110,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_56px_rgba(46,71,110,0.1)]"
                >
                  {/* 히어로 헤더 - glassmorphism hero card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-secondary/80 p-8 text-white">
                    {/* Blur orb decorations */}
                    <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl" />

                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-4xl font-extrabold tracking-tight">
                          {visit.scheduled_time ?? '시간 미정'}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          {(visit as any).service_type && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                              {formatServiceType((visit as any).service_type)}
                            </span>
                          )}
                          <span className="text-sm font-medium text-white/60">
                            담당: {(visit.nurse as any)?.user?.full_name ?? '배정 대기'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${getStatusColor(visit.status)}`}
                      >
                        {formatVisitStatus(visit.status)}
                      </span>
                    </div>
                    {visit.estimated_duration_min && (
                      <p className="relative mt-4 text-xs font-medium text-white/40">
                        예상 소요: {visit.estimated_duration_min}분
                      </p>
                    )}
                  </div>

                  {/* 스텝 인디케이터 - upgraded sizing and glow */}
                  {!isCancelled && (
                    <div className="px-8 py-6">
                      <div className="flex items-center justify-between">
                        {VISIT_STEPS.map((step, idx) => {
                          const isActive = idx <= stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div key={step.key} className="flex flex-1 flex-col items-center">
                              <div className="relative flex w-full items-center justify-center">
                                {idx > 0 && (
                                  <div
                                    className={`absolute right-1/2 h-0.5 w-full transition-colors duration-300 ${
                                      idx <= stepIdx ? 'bg-gradient-to-r from-secondary to-secondary/70' : 'bg-surface-container-high'
                                    }`}
                                  />
                                )}
                                <div
                                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                                    isCurrent
                                      ? 'bg-gradient-to-br from-secondary to-secondary/80 text-white shadow-[0_0_16px_rgba(0,106,99,0.35)] ring-4 ring-secondary/15'
                                      : isActive
                                        ? 'bg-secondary text-white'
                                        : 'bg-surface-container-high text-on-surface-variant'
                                  }`}
                                >
                                  {isActive && idx < stepIdx ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                              </div>
                              <span
                                className={`mt-2.5 text-[11px] font-bold ${
                                  isCurrent ? 'text-secondary' : isActive ? 'text-primary' : 'text-on-surface-variant/60'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
