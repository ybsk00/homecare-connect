'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getPatientsByGuardian, getVisitsByPatient } from '@homecare/supabase-client';
import {
  formatDate,
  formatVisitStatus,
  formatServiceType,
  formatCareGrade,
  getVitalTypeLabel,
  getVitalUnit,
  getVitalStatus,
  getVitalStatusColor,
  getVitalStatusLabel,
} from '@homecare/shared-utils';
import type { VitalRanges } from '@homecare/shared-utils';

const PAGE_SIZE = 10;

export default function RecordsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [page, setPage] = useState(0);

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

  const patients = useMemo(
    () => patientLinks?.map((link) => link.patient).filter(Boolean) ?? [],
    [patientLinks],
  );

  const effectivePatient = selectedPatient || patients[0]?.id || '';

  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['visit-records', effectivePatient, page],
    queryFn: () => getVisitsByPatient(supabase, effectivePatient, PAGE_SIZE, page * PAGE_SIZE),
    enabled: !!effectivePatient,
  });

  // 완료된 방문만 필터
  const completedVisits = useMemo(
    () =>
      visitsData?.data?.filter((v) =>
        ['completed', 'checked_out'].includes(v.status),
      ) ?? [],
    [visitsData],
  );

  const totalCount = visitsData?.count ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < totalCount;

  // 날짜별 그루핑
  const visitsByDate = useMemo(() => {
    const map = new Map<string, typeof completedVisits>();
    for (const v of completedVisits) {
      const date = v.scheduled_date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(v);
    }
    return Array.from(map.entries());
  }, [completedVisits]);

  const vitalDisplayKeys: (keyof VitalRanges)[] = [
    'systolic_bp',
    'diastolic_bp',
    'heart_rate',
    'temperature',
    'spo2',
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">방문 기록</h1>
        <p className="mt-1 text-[#002045]/60">방문 간호 기록을 확인하세요</p>
      </div>

      {/* 환자 선택 */}
      {patients.length > 1 && (
        <select
          value={effectivePatient}
          onChange={(e) => {
            setSelectedPatient(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm text-[#002045] shadow-[0_1px_3px_rgba(0,0,0,0.04)] outline-none focus:ring-2 focus:ring-[#006A63]/30"
        >
          {patients.map((p) => (
            <option key={p!.id} value={p!.id}>
              {p!.full_name} {p!.care_grade ? `(${formatCareGrade(p!.care_grade)})` : ''}
            </option>
          ))}
        </select>
      )}

      {/* 타임라인 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#002045]/5" />
          ))}
        </div>
      ) : completedVisits.length === 0 ? (
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
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
            />
          </svg>
          <p className="mt-3 text-sm text-[#002045]/40">완료된 방문 기록이 없습니다</p>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* 타임라인 세로선 */}
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-[#006A63]/20" />

          {visitsByDate.map(([date, visits]) => (
            <div key={date} className="relative pb-6">
              {/* 날짜 마커 */}
              <div className="absolute -left-[18px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#006A63]">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
              <p className="mb-3 text-sm font-semibold text-[#002045]">{formatDate(date)}</p>

              <div className="space-y-3">
                {visits.map((visit) => {
                  const record = visit.visit_record as any;
                  const vitals = record?.vitals as Record<string, number> | undefined;

                  return (
                    <div
                      key={visit.id}
                      className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#002045]">
                            {(visit.nurse as any)?.user?.full_name ?? '간호사'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {(visit as any).service_type && (
                              <span className="rounded-full bg-[#006A63]/10 px-2.5 py-0.5 text-xs text-[#006A63]">
                                {formatServiceType((visit as any).service_type)}
                              </span>
                            )}
                            <span className="text-xs text-[#002045]/40">
                              {visit.scheduled_time ?? ''}
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-medium text-[#22C55E]">
                          {formatVisitStatus(visit.status)}
                        </span>
                      </div>

                      {/* 바이탈 요약 */}
                      {vitals && Object.keys(vitals).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {vitalDisplayKeys.map((key) => {
                            const value = vitals[key];
                            if (value == null) return null;
                            const status = getVitalStatus(key, value);
                            const color = getVitalStatusColor(status);
                            return (
                              <span
                                key={key}
                                className="rounded-full px-2.5 py-1 text-xs"
                                style={{
                                  backgroundColor: `${color}15`,
                                  color,
                                }}
                              >
                                {getVitalTypeLabel(key)} {value}
                                {getVitalUnit(key)}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* 간호 노트 */}
                      {record?.nurse_note && (
                        <p className="mt-3 line-clamp-2 text-xs text-[#002045]/50">
                          {record.nurse_note}
                        </p>
                      )}

                      {/* 보호자 메시지 */}
                      {record?.message_to_guardian && (
                        <div className="mt-3 rounded-xl bg-[#006A63]/5 p-3">
                          <p className="text-xs font-medium text-[#006A63]">보호자 전달 사항</p>
                          <p className="mt-1 text-xs text-[#002045]/70">
                            {record.message_to_guardian}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {completedVisits.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-xl bg-white px-4 py-2 text-sm text-[#002045]/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#F7FAFC] disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-sm text-[#002045]/50">
            {page + 1} 페이지
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="rounded-xl bg-white px-4 py-2 text-sm text-[#002045]/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#F7FAFC] disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
