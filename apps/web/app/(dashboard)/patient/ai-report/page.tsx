'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getPatientsByGuardian,
  getAIReportsByPatient,
  getAIReport,
} from '@homecare/supabase-client';
import {
  formatDate,
  formatCareGrade,
  formatRelativeTime,
} from '@homecare/shared-utils';

export default function AIReportPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

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

  const { data: reports, isLoading } = useQuery({
    queryKey: ['ai-reports', effectivePatient],
    queryFn: () => getAIReportsByPatient(supabase, effectivePatient),
    enabled: !!effectivePatient,
  });

  // 확장된 리포트 상세
  const { data: reportDetail } = useQuery({
    queryKey: ['ai-report-detail', expandedReport],
    queryFn: () => getAIReport(supabase, expandedReport!),
    enabled: !!expandedReport,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generating':
        return { label: '생성 중', style: 'bg-[#F59E0B]/10 text-[#F59E0B]' };
      case 'generated':
        return { label: '생성 완료', style: 'bg-[#006A63]/10 text-[#006A63]' };
      case 'doctor_reviewed':
        return { label: '의사 검토 완료', style: 'bg-[#002045]/10 text-[#002045]' };
      case 'sent':
        return { label: '발송 완료', style: 'bg-[#22C55E]/10 text-[#22C55E]' };
      case 'error':
        return { label: '오류', style: 'bg-[#EF4444]/10 text-[#EF4444]' };
      default:
        return { label: status, style: 'bg-[#002045]/10 text-[#002045]' };
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">AI 리포트</h1>
        <p className="mt-1 text-[#002045]/60">
          AI가 분석한 건강 경과 리포트를 확인하세요
        </p>
      </div>

      {/* 환자 선택 */}
      {patients.length > 1 && (
        <select
          value={effectivePatient}
          onChange={(e) => {
            setSelectedPatient(e.target.value);
            setExpandedReport(null);
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

      {/* 리포트 안내 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#4A2080]/10 to-[#006A63]/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#4A2080]/10 p-2.5">
            <svg className="h-6 w-6 text-[#4A2080]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#002045]">AI 건강 경과 분석</h3>
            <p className="mt-1 text-xs text-[#002045]/60">
              방문 기록과 바이탈 데이터를 바탕으로 AI가 환자의 건강 변화를 분석합니다.
              의사 소견이 추가된 리포트는 더욱 신뢰할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 리포트 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#002045]/5" />
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="mt-3 text-sm text-[#002045]/40">
            아직 생성된 AI 리포트가 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const badge = getStatusBadge(report.status);
            const isExpanded = expandedReport === report.id;

            return (
              <div key={report.id}>
                <button
                  onClick={() =>
                    setExpandedReport(isExpanded ? null : report.id)
                  }
                  className="w-full rounded-2xl bg-white p-5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#002045]">
                          {formatDate(report.period_start)} ~ {formatDate(report.period_end)}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      {report.ai_summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-[#002045]/60">
                          {report.ai_summary}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-[#002045]/40">
                        <span>{formatRelativeTime(report.created_at)}</span>
                        {report.doctor_confirmed && (
                          <span className="flex items-center gap-1 text-[#006A63]">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            의사 검토 완료
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-[#002045]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {/* 확장된 상세 */}
                {isExpanded && reportDetail && (
                  <div className="mt-1 rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    {/* AI 분석 */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#002045]">AI 분석 요약</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#002045]/70">
                        {reportDetail.ai_summary ?? '분석 내용이 아직 생성되지 않았습니다.'}
                      </p>
                    </div>

                    {/* 바이탈 트렌드 */}
                    {reportDetail.vitals_chart_data != null && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-[#002045]">바이탈 변화 추이</h3>
                        <div className="mt-3 rounded-xl bg-[#F7FAFC] p-4">
                          <pre className="whitespace-pre-wrap text-xs text-[#002045]/60">
                            {typeof reportDetail.vitals_chart_data === 'string'
                              ? reportDetail.vitals_chart_data
                              : JSON.stringify(reportDetail.vitals_chart_data as Record<string, unknown>, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* 의사 소견 */}
                    {reportDetail.doctor_confirmed && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-[#002045]">의사 소견</h3>
                        <div className="mt-3 rounded-xl bg-[#006A63]/5 p-4">
                          <p className="text-sm text-[#002045]/70">
                            {reportDetail.doctor_opinion_simple ?? reportDetail.doctor_opinion ?? '소견 없음'}
                          </p>
                          {reportDetail.doctor_confirmed_at && (
                            <p className="mt-2 text-xs text-[#002045]/40">
                              검토일: {formatDate(reportDetail.doctor_confirmed_at)}
                              {' · '}
                              {(reportDetail.doctor as any)?.user?.full_name ?? '담당 의사'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 의사 소견 요청 버튼 */}
                    {!reportDetail.doctor_confirmed && reportDetail.status === 'generated' && (
                      <div className="mt-6 text-center">
                        <p className="text-xs text-[#002045]/40">
                          아직 의사 소견이 추가되지 않았습니다
                        </p>
                        <button className="mt-2 rounded-xl bg-gradient-to-r from-[#002045] to-[#003060] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
                          의사 소견 요청
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
