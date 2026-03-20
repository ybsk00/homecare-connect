'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Sparkles,
  Send,
  AlertTriangle,
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
  const queryClient = useQueryClient();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Tables<'ai_reports'> | null>(null);
  const [doctorOpinion, setDoctorOpinion] = useState('');
  const [doctorOpinionSimple, setDoctorOpinionSimple] = useState('');
  const [isConverting, setIsConverting] = useState(false);

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
    setDoctorOpinion(report.doctor_opinion || '');
    setDoctorOpinionSimple(report.doctor_opinion_simple || '');
    setReportModalOpen(true);
  };

  // 의사 소견 저장
  const saveOpinionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) return;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('ai_reports')
        .update({
          doctor_opinion: doctorOpinion,
          doctor_opinion_simple: doctorOpinionSimple,
          status: 'doctor_reviewed',
        } as never)
        .eq('id', selectedReport.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports'] });
      if (selectedReport) {
        setSelectedReport({
          ...selectedReport,
          doctor_opinion: doctorOpinion,
          doctor_opinion_simple: doctorOpinionSimple,
          status: 'doctor_reviewed',
        });
      }
    },
  });

  // AI 쉬운 말 변환
  const convertToSimple = async () => {
    if (!doctorOpinion.trim()) return;
    setIsConverting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.functions.invoke('ai-report', {
        body: {
          action: 'simplify_opinion',
          doctor_opinion: doctorOpinion,
          patient_name: (selectedReport as any)?.patients?.full_name || '환자',
        },
      });
      if (data?.simplified) {
        setDoctorOpinionSimple(data.simplified);
      } else {
        // Fallback: 간단한 변환 메시지
        setDoctorOpinionSimple(`[보호자용] ${doctorOpinion}`);
      }
    } catch {
      setDoctorOpinionSimple(`[보호자용] ${doctorOpinion}`);
    } finally {
      setIsConverting(false);
    }
  };

  // 보호자 전달
  const sendToGuardianMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) return;
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('ai_reports')
        .update({ status: 'sent' } as never)
        .eq('id', selectedReport.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports'] });
      if (selectedReport) {
        setSelectedReport({ ...selectedReport, status: 'sent' });
      }
    },
  });

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

            {/* 의사 소견 입력 */}
            <div className="rounded-xl bg-primary/5 p-5">
              <h4 className="mb-2 text-sm font-semibold text-primary">
                <Stethoscope className="mr-1.5 inline h-4 w-4" />
                의사 소견
              </h4>
              <textarea
                value={doctorOpinion}
                onChange={(e) => setDoctorOpinion(e.target.value)}
                placeholder="환자 상태에 대한 의사 소견을 입력하세요..."
                rows={4}
                className="block w-full rounded-lg bg-white px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={convertToSimple}
                  disabled={!doctorOpinion.trim() || isConverting}
                  loading={isConverting}
                >
                  <Sparkles className="h-4 w-4" />
                  쉬운 말로 변환
                </Button>
                <span className="text-[10px] text-on-surface-variant">
                  AI가 보호자가 이해하기 쉬운 말로 변환합니다
                </span>
              </div>
            </div>

            {/* 보호자용 쉬운 설명 */}
            <div className="rounded-xl bg-secondary/5 p-5">
              <h4 className="mb-2 text-sm font-semibold text-secondary">
                보호자용 쉬운 설명
              </h4>
              <textarea
                value={doctorOpinionSimple}
                onChange={(e) => setDoctorOpinionSimple(e.target.value)}
                placeholder="AI 변환 후 여기에 표시됩니다. 직접 수정도 가능합니다."
                rows={3}
                className="block w-full rounded-lg bg-white px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-secondary/40"
              />
            </div>

            {/* 면책 고지 */}
            <div className="flex items-start gap-2 rounded-lg bg-tertiary/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
              <p className="text-[11px] leading-relaxed text-tertiary/80">
                이 소견은 참고용이며, 정확한 진단 및 치료를 대체하지 않습니다.
                보호자에게 전달 시 자동으로 면책 고지가 포함됩니다.
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setReportModalOpen(false)}>닫기</Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  loading={saveOpinionMutation.isPending}
                  onClick={() => saveOpinionMutation.mutate()}
                  disabled={!doctorOpinion.trim()}
                >
                  소견 저장
                </Button>
                {selectedReport.status === 'doctor_reviewed' && (
                  <Button
                    loading={sendToGuardianMutation.isPending}
                    onClick={() => sendToGuardianMutation.mutate()}
                  >
                    <Send className="h-4 w-4" />
                    보호자 전달
                  </Button>
                )}
              </div>
            </div>

            {saveOpinionMutation.isSuccess && (
              <p className="rounded-lg bg-secondary/10 p-2 text-center text-xs text-secondary">
                의사 소견이 저장되었습니다.
              </p>
            )}
            {sendToGuardianMutation.isSuccess && (
              <p className="rounded-lg bg-secondary/10 p-2 text-center text-xs text-secondary">
                보호자에게 전달되었습니다.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
