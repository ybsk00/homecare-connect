'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Loading } from '@/components/ui/Loading';
import { Input } from '@/components/ui/Input';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { formatDate } from '@homecare/shared-utils';

export default function ClaimsPage() {
  const { organization } = useAppStore();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['claims-visits', organization?.id, startDate, endDate],
    queryFn: async () => {
      if (!organization?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, status,
          actual_duration_min, estimated_duration_min,
          patient:patients(full_name, care_grade),
          nurse:staff_profiles(user:profiles(full_name))
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'completed')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });
      return (data ?? []) as Array<{
        id: string;
        scheduled_date: string;
        scheduled_time: string | null;
        status: string;
        actual_duration_min: number | null;
        estimated_duration_min: number | null;
        patient: { full_name: string; care_grade: string | null };
        nurse: { user: { full_name: string } } | null;
      }>;
    },
    enabled: !!organization?.id,
  });

  const totalDuration = useMemo(
    () => visits.reduce((sum, v) => sum + (v.actual_duration_min ?? v.estimated_duration_min ?? 0), 0),
    [visits],
  );

  const patientCount = useMemo(() => {
    const set = new Set(visits.map((v) => v.patient.full_name));
    return set.size;
  }, [visits]);

  // CSV 다운로드
  const downloadCSV = () => {
    const headers = ['날짜', '시간', '환자명', '장기요양등급', '간호사', '소요시간(분)'];
    const rows = visits.map((v) => [
      v.scheduled_date,
      v.scheduled_time?.slice(0, 5) ?? '',
      v.patient.full_name,
      v.patient.care_grade ?? '',
      v.nurse?.user?.full_name ?? '',
      String(v.actual_duration_min ?? v.estimated_duration_min ?? ''),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `건보청구자료_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  type Visit = typeof visits[0];
  const columns = [
    { key: 'scheduled_date', header: '날짜', render: (v: Visit) => formatDate(v.scheduled_date) },
    { key: 'scheduled_time', header: '시간', render: (v: Visit) => v.scheduled_time?.slice(0, 5) ?? '-' },
    { key: 'patient', header: '환자', render: (v: Visit) => v.patient.full_name },
    { key: 'care_grade', header: '등급', render: (v: Visit) => v.patient.care_grade ? <Badge variant="primary">{v.patient.care_grade}등급</Badge> : '-' },
    { key: 'nurse', header: '간호사', render: (v: Visit) => v.nurse?.user?.full_name ?? '-' },
    { key: 'duration', header: '소요시간', render: (v: Visit) => `${v.actual_duration_min ?? v.estimated_duration_min ?? '-'}분` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">건보 청구 자료</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          기간별 방문 기록을 자동 취합하여 급여 청구 참고 자료를 생성합니다.
        </p>
      </div>

      {/* 면책 고지 */}
      <div className="flex items-start gap-3 rounded-xl bg-tertiary/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" />
        <div>
          <p className="text-sm font-semibold text-tertiary">참고 자료 안내</p>
          <p className="mt-1 text-xs leading-relaxed text-tertiary/80">
            본 자료는 방문 기록을 기반으로 자동 생성된 참고 자료이며, 실제 건강보험 급여 청구는 기관의 책임 하에 진행하셔야 합니다.
            청구 기준 및 수가 적용은 건강보험심사평가원 기준에 따라 별도 확인이 필요합니다.
          </p>
        </div>
      </div>

      {/* 기간 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Calendar className="mr-2 inline h-5 w-5 text-secondary" />
            조회 기간
          </CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">시작일</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">종료일</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* 요약 통계 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-primary/5 p-5">
              <p className="text-xs text-on-surface-variant">총 방문 건수</p>
              <p className="mt-1 text-2xl font-bold text-primary">{visits.length}건</p>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-5">
              <p className="text-xs text-on-surface-variant">총 소요시간</p>
              <p className="mt-1 text-2xl font-bold text-secondary">{totalDuration}분</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-xs text-on-surface-variant">환자 수</p>
              <p className="mt-1 text-2xl font-bold text-on-surface">{patientCount}명</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-xs text-on-surface-variant">평균 소요시간</p>
              <p className="mt-1 text-2xl font-bold text-on-surface">{visits.length ? Math.round(totalDuration / visits.length) : 0}분</p>
            </div>
          </div>

          {/* 다운로드 버튼 */}
          <div className="flex items-center gap-3">
            <Button onClick={downloadCSV} disabled={visits.length === 0}>
              <Download className="h-4 w-4" />
              CSV 다운로드
            </Button>
          </div>

          {/* 방문 기록 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <ClipboardList className="mr-2 inline h-5 w-5 text-on-surface-variant" />
                방문 기록 상세 ({visits.length}건)
              </CardTitle>
            </CardHeader>
            {visits.length === 0 ? (
              <div className="py-12 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-on-surface-variant/30" />
                <p className="mt-3 text-sm text-on-surface-variant">해당 기간에 완료된 방문이 없습니다.</p>
              </div>
            ) : (
              <Table
                data={visits}
                columns={columns}
                keyExtractor={(v) => v.id}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
