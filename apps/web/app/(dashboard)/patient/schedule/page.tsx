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
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">일정</h1>
          <p className="mt-1 text-on-surface-variant">방문 일정을 확인하세요</p>
        </div>

        {/* 주간/월간 토글 */}
        <div className="flex rounded-xl bg-surface-container-low p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-[0_10px_40px_rgba(24,28,30,0.05)]'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-surface-container-lowest text-primary shadow-[0_10px_40px_rgba(24,28,30,0.05)]'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {/* 주간 캘린더 */}
      {viewMode === 'week' && (
        <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
          {/* 주간 네비게이션 */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-xl bg-surface p-2 text-on-surface-variant transition-colors hover:bg-primary/10"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <p className="text-sm font-medium text-primary">
              {weekRange.start.replace(/-/g, '.')} ~ {weekRange.end.replace(/-/g, '.')}
            </p>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-xl bg-surface p-2 text-on-surface-variant transition-colors hover:bg-primary/10"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* 요일 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date) => {
              const dateStr = toDateString(date);
              const isSelected = dateStr === selectedDate;
              const today = isToday(date);
              const hasVisits = visitsByDate.has(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-3 transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : today
                        ? 'bg-secondary/10 text-secondary'
                        : 'text-on-surface-variant hover:bg-surface'
                  }`}
                >
                  <span className="text-xs">{getVisitDayLabel(date.getDay())}</span>
                  <span className="text-lg font-semibold">{date.getDate()}</span>
                  {hasVisits && (
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-secondary'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 월간 캘린더 */}
      {viewMode === 'month' && (
        <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
          {/* 월간 네비게이션 */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="rounded-xl bg-surface p-2 text-on-surface-variant transition-colors hover:bg-primary/10"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-primary">{monthYear}</p>
            <button
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="rounded-xl bg-surface p-2 text-on-surface-variant transition-colors hover:bg-primary/10"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-on-surface-variant">
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
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : today
                        ? 'bg-secondary/10 text-secondary'
                        : 'text-on-surface-variant hover:bg-surface'
                  }`}
                >
                  <span className="text-sm font-medium">{date.getDate()}</span>
                  {hasVisits && (
                    <div
                      className={`h-1 w-1 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-secondary'
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
      <section>
        <h2 className="mb-6 text-sm font-medium text-on-surface-variant">
          {formatDateWithDay(selectedDate)}
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-primary/5" />
            ))}
          </div>
        ) : selectedVisits.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
              <svg
                className="h-8 w-8 text-primary/30"
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
            <p className="mt-4 text-sm font-medium text-primary">
              예정된 방문이 없습니다
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              이 날짜에는 아직 방문 일정이 잡혀있지 않습니다
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedVisits.map((visit) => {
              const stepIdx = getStepIndex(visit.status);
              const isCancelled = visit.status === 'cancelled' || visit.status === 'no_show';

              return (
                <div
                  key={visit.id}
                  className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_10px_40px_rgba(24,28,30,0.05)]"
                >
                  {/* 히어로 헤더 */}
                  <div className="bg-gradient-to-br from-primary to-primary-container p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-bold tracking-tight">
                          {visit.scheduled_time ?? '시간 미정'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {(visit as any).service_type && (
                            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                              {formatServiceType((visit as any).service_type)}
                            </span>
                          )}
                          <span className="text-sm text-white/70">
                            담당: {(visit.nurse as any)?.user?.full_name ?? '배정 대기'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(visit.status)}`}
                      >
                        {formatVisitStatus(visit.status)}
                      </span>
                    </div>
                    {visit.estimated_duration_min && (
                      <p className="mt-2 text-xs text-white/50">
                        예상 소요: {visit.estimated_duration_min}분
                      </p>
                    )}
                  </div>

                  {/* 스텝 인디케이터 */}
                  {!isCancelled && (
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        {VISIT_STEPS.map((step, idx) => {
                          const isActive = idx <= stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div key={step.key} className="flex flex-1 flex-col items-center">
                              <div className="relative flex w-full items-center justify-center">
                                {idx > 0 && (
                                  <div
                                    className={`absolute right-1/2 h-0.5 w-full ${
                                      idx <= stepIdx ? 'bg-secondary' : 'bg-surface-container-high'
                                    }`}
                                  />
                                )}
                                <div
                                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    isCurrent
                                      ? 'bg-secondary text-white ring-4 ring-secondary/20'
                                      : isActive
                                        ? 'bg-secondary text-white'
                                        : 'bg-surface-container-high text-on-surface-variant'
                                  }`}
                                >
                                  {isActive && idx < stepIdx ? (
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                              </div>
                              <span
                                className={`mt-1.5 text-[10px] font-medium ${
                                  isCurrent ? 'text-secondary' : isActive ? 'text-primary' : 'text-on-surface-variant'
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
