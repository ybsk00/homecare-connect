'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import {
  Stethoscope,
  Calendar,
  FileText,
  User,
  Clock,
  Eye,
} from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

const reportStatusLabels: Record<string, string> = {
  generating: '생성중',
  generated: '완료',
  doctor_reviewed: '의사확인',
  sent: '발송완료',
  error: '오류',
};

export default function DoctorPage() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Tables<'ai_reports'> | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['ai-reports'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('ai_reports')
        .select('*, patients(full_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      return (data || []) as (Tables<'ai_reports'> & {
        patients: { full_name: string } | null;
      })[];
    },
  });

  const upcomingReports = reports.filter(
    (r) => r.doctor_visit_date && new Date(r.doctor_visit_date) >= new Date()
  );

  const recentReports = reports.filter(
    (r) => !r.doctor_visit_date || new Date(r.doctor_visit_date) < new Date()
  );

  const openReport = (report: Tables<'ai_reports'>) => {
    setSelectedReport(report);
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">의사 방문 관리</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          방문진료 일정 및 AI 경과 리포트를 관리합니다.
        </p>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Upcoming doctor visits */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Stethoscope className="mr-2 inline h-5 w-5 text-secondary" />
                예정된 의사 방문
              </CardTitle>
            </CardHeader>
            {upcomingReports.length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                예정된 방문진료가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingReports.map((report, idx) => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between rounded-xl px-5 py-3.5 ${
                      idx % 2 === 0 ? 'bg-surface-container-low/50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                        <Calendar className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-on-surface-variant" />
                          <span className="text-sm font-medium text-on-surface">
                            {(report as Record<string, unknown> & { patients: { full_name: string } | null }).patients?.full_name || '환자'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
                          <Clock className="h-3 w-3" />
                          방문일: {report.doctor_visit_date}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        <FileText className="mr-1 h-3 w-3" />
                        {reportStatusLabels[report.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                        리포트
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent reports */}
          <Card>
            <CardHeader>
              <CardTitle>
                <FileText className="mr-2 inline h-5 w-5 text-on-surface-variant" />
                최근 AI 리포트
              </CardTitle>
            </CardHeader>
            {recentReports.length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                리포트가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {recentReports.map((report, idx) => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between rounded-xl px-5 py-3.5 ${
                      idx % 2 === 0 ? 'bg-surface-container-low/50' : 'bg-white'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-on-surface">
                        {(report as Record<string, unknown> & { patients: { full_name: string } | null }).patients?.full_name || '환자'}
                      </span>
                      <span className="ml-2 text-xs text-on-surface-variant">
                        {report.period_start} ~ {report.period_end}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        {reportStatusLabels[report.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Report detail modal */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="AI 경과 리포트"
        size="xl"
      >
        {selectedReport && (
          <div className="space-y-5">
            <div className="rounded-xl bg-surface-container-low p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-on-surface-variant">기간:</span>{' '}
                  <span className="font-medium text-on-surface">
                    {selectedReport.period_start} ~ {selectedReport.period_end}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant">상태:</span>{' '}
                  <Badge variant={getStatusBadgeVariant(selectedReport.status)}>
                    {reportStatusLabels[selectedReport.status]}
                  </Badge>
                </div>
              </div>
            </div>

            {selectedReport.patient_summary && (
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-on-surface">
                  환자 요약
                </h4>
                <p className="text-sm text-on-surface-variant">
                  {selectedReport.patient_summary}
                </p>
              </div>
            )}

            {selectedReport.ai_summary && (
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-on-surface">
                  AI 분석 요약
                </h4>
                <p className="text-sm text-on-surface-variant">
                  {selectedReport.ai_summary}
                </p>
              </div>
            )}

            {selectedReport.doctor_opinion && (
              <div className="rounded-xl bg-primary/5 p-5">
                <h4 className="mb-1.5 text-sm font-semibold text-primary">
                  의사 소견
                </h4>
                <p className="text-sm text-on-surface">
                  {selectedReport.doctor_opinion}
                </p>
              </div>
            )}

            {selectedReport.doctor_opinion_simple && (
              <div className="rounded-xl bg-secondary/5 p-5">
                <h4 className="mb-1.5 text-sm font-semibold text-secondary">
                  보호자용 쉬운 설명
                </h4>
                <p className="text-sm text-on-surface">
                  {selectedReport.doctor_opinion_simple}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setReportModalOpen(false)}>닫기</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
