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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const PAGE_SIZE = 10;

type ChartVitalKey = 'systolic_bp' | 'diastolic_bp' | 'heart_rate' | 'temperature' | 'spo2';

const CHART_VITALS: { key: ChartVitalKey; label: string; color: string; unit: string }[] = [
  { key: 'systolic_bp', label: '수축기 혈압', color: '#002045', unit: 'mmHg' },
  { key: 'diastolic_bp', label: '이완기 혈압', color: '#1A365D', unit: 'mmHg' },
  { key: 'heart_rate', label: '심박수', color: '#006A63', unit: 'bpm' },
  { key: 'temperature', label: '체온', color: '#FF9800', unit: '\u00B0C' },
  { key: 'spo2', label: 'SpO2', color: '#BA1A1A', unit: '%' },
];

export default function RecordsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [page, setPage] = useState(0);
  const [activeChartKeys, setActiveChartKeys] = useState<ChartVitalKey[]>([
    'systolic_bp',
    'heart_rate',
  ]);

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

  // 바이탈 차트 데이터
  const chartData = useMemo(() => {
    return completedVisits
      .filter((v) => {
        const vitals = (v.visit_record as any)?.vitals;
        return vitals && Object.keys(vitals).length > 0;
      })
      .map((v) => {
        const vitals = (v.visit_record as any)?.vitals as Record<string, number>;
        return {
          date: v.scheduled_date,
          ...vitals,
        };
      })
      .reverse(); // oldest first for chart
  }, [completedVisits]);

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

  const toggleChartKey = (key: ChartVitalKey) => {
    setActiveChartKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">방문 기록</h1>
        <p className="mt-1 text-on-surface-variant">방문 간호 기록을 확인하세요</p>
      </div>

      {/* 환자 선택 */}
      {patients.length > 1 && (
        <select
          value={effectivePatient}
          onChange={(e) => {
            setSelectedPatient(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-xl bg-surface-container-lowest px-4 py-3 text-sm text-primary shadow-[0_10px_40px_rgba(24,28,30,0.05)] outline-none focus:ring-2 focus:ring-secondary/30"
        >
          {patients.map((p) => (
            <option key={p!.id} value={p!.id}>
              {p!.full_name} {p!.care_grade ? `(${formatCareGrade(p!.care_grade)})` : ''}
            </option>
          ))}
        </select>
      )}

      {/* 바이탈 추세 차트 */}
      {chartData.length > 1 && (
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
          <h2 className="text-sm font-semibold text-primary">바이탈 추세</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">최근 방문 기록 기반</p>

          {/* 차트 범례 토글 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CHART_VITALS.map((v) => (
              <button
                key={v.key}
                onClick={() => toggleChartKey(v.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeChartKeys.includes(v.key)
                    ? 'text-white'
                    : 'bg-surface text-on-surface-variant'
                }`}
                style={
                  activeChartKeys.includes(v.key)
                    ? { backgroundColor: v.color }
                    : undefined
                }
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#42474E' }}
                  tickFormatter={(val: string) => {
                    const parts = val.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#42474E' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                    fontSize: 12,
                  }}
                />
                {CHART_VITALS.filter((v) => activeChartKeys.includes(v.key)).map((v) => (
                  <Line
                    key={v.key}
                    type="monotone"
                    dataKey={v.key}
                    stroke={v.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: v.color }}
                    name={`${v.label} (${v.unit})`}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 타임라인 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-primary/5" />
          ))}
        </div>
      ) : completedVisits.length === 0 ? (
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
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-primary">완료된 방문 기록이 없습니다</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            방문 간호가 완료되면 이곳에서 기록을 확인하실 수 있습니다
          </p>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* 타임라인 세로선 */}
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-secondary/20" />

          {visitsByDate.map(([date, visits], dateIdx) => (
            <div key={date} className="relative pb-8">
              {/* 날짜 마커 */}
              <div className="absolute -left-[18px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
              <p className="mb-4 text-sm font-semibold text-primary">{formatDate(date)}</p>

              <div className="space-y-4">
                {visits.map((visit) => {
                  const record = visit.visit_record as any;
                  const vitals = record?.vitals as Record<string, number> | undefined;
                  const performedItems = record?.performed_items as any[] | undefined;
                  const isLatest = dateIdx === 0;

                  return (
                    <div
                      key={visit.id}
                      className={`rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)] ${
                        isLatest ? 'border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-primary">
                            {(visit.nurse as any)?.user?.full_name ?? '간호사'}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            {(visit as any).service_type && (
                              <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary">
                                {formatServiceType((visit as any).service_type)}
                              </span>
                            )}
                            <span className="text-xs text-on-surface-variant">
                              {visit.scheduled_time ?? ''}
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                          {formatVisitStatus(visit.status)}
                        </span>
                      </div>

                      {/* 바이탈 요약 */}
                      {vitals && Object.keys(vitals).length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {vitalDisplayKeys.map((key) => {
                            const value = vitals[key];
                            if (value == null) return null;
                            const status = getVitalStatus(key, value);
                            const color = getVitalStatusColor(status);
                            return (
                              <span
                                key={key}
                                className="rounded-full px-2.5 py-1 text-xs font-medium"
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

                      {/* 수행내역 체크리스트 */}
                      {performedItems && performedItems.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium text-on-surface-variant">수행 내역</p>
                          <div className="space-y-1.5">
                            {performedItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={`flex h-4.5 w-4.5 items-center justify-center rounded ${
                                  item.done !== false ? 'bg-secondary/10' : 'bg-surface-container-high'
                                }`}>
                                  {item.done !== false ? (
                                    <svg className="h-3 w-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  ) : (
                                    <div className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/30" />
                                  )}
                                </div>
                                <span className={`text-xs ${
                                  item.done !== false ? 'text-primary' : 'text-on-surface-variant line-through'
                                }`}>
                                  {item.name ?? item.item ?? item.label ?? `항목 ${idx + 1}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 간호 노트 */}
                      {record?.nurse_note && (
                        <p className="mt-4 line-clamp-2 text-xs text-on-surface-variant">
                          {record.nurse_note}
                        </p>
                      )}

                      {/* 보호자 메시지 */}
                      {record?.message_to_guardian && (
                        <div className="mt-4 rounded-xl bg-secondary/5 p-3">
                          <p className="text-xs font-medium text-secondary">보호자 전달 사항</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
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
            className="rounded-xl bg-surface-container-lowest px-4 py-2 text-sm text-on-surface-variant shadow-[0_10px_40px_rgba(24,28,30,0.05)] transition-colors hover:bg-surface disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-sm text-on-surface-variant">
            {page + 1} 페이지
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="rounded-xl bg-surface-container-lowest px-4 py-2 text-sm text-on-surface-variant shadow-[0_10px_40px_rgba(24,28,30,0.05)] transition-colors hover:bg-surface disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
