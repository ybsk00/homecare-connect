'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getPatientsByGuardian, getVisitsByPatient } from '@homecare/supabase-client';
import {
  formatVisitStatus,
  formatServiceType,
  getWeekRange,
  toDateString,
  addDays,
  getVisitDayLabel,
  isToday,
  formatDateWithDay,
} from '@homecare/shared-utils';

export default function SchedulePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [weekOffset, setWeekOffset] = useState(0);
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

  // 방문 데이터
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['visits-week', primaryPatient?.id, weekRange.start, weekRange.end],
    queryFn: () => getVisitsByPatient(supabase, primaryPatient!.id, 100, 0),
    enabled: !!primaryPatient?.id,
  });

  // 선택된 날짜의 방문 필터
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
        return 'bg-[#22C55E]/10 text-[#22C55E]';
      case 'in_progress':
      case 'checked_in':
        return 'bg-[#F59E0B]/10 text-[#F59E0B]';
      case 'cancelled':
      case 'no_show':
        return 'bg-[#EF4444]/10 text-[#EF4444]';
      default:
        return 'bg-[#002045]/10 text-[#002045]';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">일정</h1>
        <p className="mt-1 text-[#002045]/60">방문 일정을 확인하세요</p>
      </div>

      {/* 주간 캘린더 */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* 주간 네비게이션 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="rounded-xl bg-[#F7FAFC] p-2 text-[#002045]/60 transition-colors hover:bg-[#002045]/10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="text-sm font-medium text-[#002045]">
            {weekRange.start.replace(/-/g, '.')} ~ {weekRange.end.replace(/-/g, '.')}
          </p>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="rounded-xl bg-[#F7FAFC] p-2 text-[#002045]/60 transition-colors hover:bg-[#002045]/10"
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
                    ? 'bg-[#002045] text-white'
                    : today
                      ? 'bg-[#006A63]/10 text-[#006A63]'
                      : 'text-[#002045]/70 hover:bg-[#F7FAFC]'
                }`}
              >
                <span className="text-xs">{getVisitDayLabel(date.getDay())}</span>
                <span className="text-lg font-semibold">{date.getDate()}</span>
                {hasVisits && (
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-[#006A63]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 방문 목록 */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-[#002045]/60">
          {formatDateWithDay(selectedDate)}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#002045]/5" />
            ))}
          </div>
        ) : selectedVisits.length === 0 ? (
          <div className="rounded-2xl bg-[#002045]/5 p-10 text-center">
            <svg
              className="mx-auto h-12 w-12 text-[#002045]/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            <p className="mt-3 text-sm text-[#002045]/40">
              선택한 날짜에 예정된 방문이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedVisits.map((visit) => (
              <div
                key={visit.id}
                className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#002045]">
                        {visit.scheduled_time ?? '시간 미정'}
                      </span>
                      {(visit as any).service_type && (
                        <span className="rounded-full bg-[#006A63]/10 px-2.5 py-0.5 text-xs text-[#006A63]">
                          {formatServiceType((visit as any).service_type)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[#002045]/60">
                      담당: {(visit.nurse as any)?.user?.full_name ?? '배정 대기'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(visit.status)}`}
                  >
                    {formatVisitStatus(visit.status)}
                  </span>
                </div>
                {visit.estimated_duration_min && (
                  <p className="mt-2 text-xs text-[#002045]/40">
                    예상 소요: {visit.estimated_duration_min}분
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
