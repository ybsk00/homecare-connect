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
        return { label: '생성 중', style: 'bg-tertiary-100 text-tertiary-700' };
      case 'generated':
        return { label: '생성 완료', style: 'bg-secondary/10 text-secondary' };
      case 'doctor_reviewed':
        return { label: '의사 검토 완료', style: 'bg-primary/10 text-primary' };
      case 'sent':
        return { label: '발송 완료', style: 'bg-secondary/10 text-secondary' };
      case 'error':
        return { label: '오류', style: 'bg-error-container text-error' };
      default:
        return { label: status, style: 'bg-primary/10 text-primary' };
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">AI 리포트</h1>
        <p className="mt-1 text-on-surface-variant">
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
          className="w-full rounded-xl bg-surface-container-lowest px-4 py-3 text-sm text-primary shadow-[0_10px_40px_rgba(24,28,30,0.05)] outline-none focus:ring-2 focus:ring-secondary/30"
        >
          {patients.map((p) => (
            <option key={p!.id} value={p!.id}>
              {p!.full_name} {p!.care_grade ? `(${formatCareGrade(p!.care_grade)})` : ''}
            </option>
          ))}
        </select>
      )}

      {/* 리포트 안내 */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">AI 건강 경과 분석</h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              방문 기록과 바이탈 데이터를 바탕으로 AI가 환자의 건강 변화를 분석합니다.
              의사 소견이 추가된 리포트는 더욱 신뢰할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 리포트 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-primary/5" />
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="rounded-2xl bg-primary/5 p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-primary/20"
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
          <p className="mt-3 text-sm text-on-surface-variant">
            아직 생성된 AI 리포트가 없습니다
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/60">
            방문 기록이 쌓이면 AI가 자동으로 건강 리포트를 생성합니다
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const badge = getStatusBadge(report.status);
            const isExpanded = expandedReport === report.id;

            return (
              <div key={report.id}>
                <button
                  onClick={() =>
                    setExpandedReport(isExpanded ? null : report.id)
                  }
                  className="w-full rounded-2xl bg-surface-container-lowest p-5 text-left shadow-[0_10px_40px_rgba(24,28,30,0.05)] transition-shadow hover:shadow-[0_10px_40px_rgba(24,28,30,0.1)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-primary">
                          {formatDate(report.period_start)} ~ {formatDate(report.period_end)}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      {report.ai_summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
                          {report.ai_summary}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-on-surface-variant/60">
                        <span>{formatRelativeTime(report.created_at)}</span>
                        {report.doctor_confirmed && (
                          <span className="flex items-center gap-1 text-secondary">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            의사 검토 완료
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-on-surface-variant/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                  <div className="mt-2 space-y-6 rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
                    {/* AI 분석 */}
                    <div>
                      <h3 className="text-lg font-bold text-primary">AI 분석 요약</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
                        {reportDetail.ai_summary ?? '분석 내용이 아직 생성되지 않았습니다.'}
                      </p>
                    </div>

                    {/* 바이탈 트렌드 */}
                    {reportDetail.vitals_chart_data != null && (
                      <div>
                        <h3 className="text-lg font-bold text-primary">바이탈 변화 추이</h3>
                        <div className="mt-3 rounded-xl bg-surface p-4">
                          <pre className="whitespace-pre-wrap text-xs text-on-surface-variant">
                            {typeof reportDetail.vitals_chart_data === 'string'
                              ? reportDetail.vitals_chart_data
                              : JSON.stringify(reportDetail.vitals_chart_data as Record<string, unknown>, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* 의사 소견 */}
                    {reportDetail.doctor_confirmed && (
                      <div>
                        <h3 className="text-lg font-bold text-primary">의사 소견</h3>
                        <div className="mt-3 rounded-xl bg-secondary/5 p-4">
                          <p className="text-sm text-on-surface-variant">
                            {reportDetail.doctor_opinion_simple ?? reportDetail.doctor_opinion ?? '소견 없음'}
                          </p>
                          {reportDetail.doctor_confirmed_at && (
                            <p className="mt-2 text-xs text-on-surface-variant/60">
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
                      <div className="text-center">
                        <p className="text-xs text-on-surface-variant/60">
                          아직 의사 소견이 추가되지 않았습니다
                        </p>
                        <button className="mt-2 rounded-xl bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
                          의사 소견 요청
                        </button>
                      </div>
                    )}

                    {/* 면책 고지 */}
                    <div className="rounded-xl bg-tertiary-50 p-4">
                      <div className="flex items-start gap-2">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-tertiary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        <p className="text-xs leading-relaxed text-tertiary-700">
                          이 정보는 참고용이며 의료 진단을 대체하지 않습니다. 정확한 건강 상담은 반드시 담당 의료진에게 문의하시기 바랍니다.
                        </p>
                      </div>
                    </div>
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
