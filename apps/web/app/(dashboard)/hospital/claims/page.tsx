'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Users,
  Clock,
  Filter,
  BarChart3,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@homecare/shared-utils';
import { clsx } from 'clsx';

/* ───────────────────── Fee schedule ───────────────────── */

// 방문간호 수가 기준 (2026년 기준 참고용, 실제 수가는 심평원 기준 확인 필요)
const VISIT_FEE_TABLE: Record<string, { label: string; baseFee: number }> = {
  regular: { label: '정기 방문', baseFee: 48520 },
  special: { label: '특별 방문', baseFee: 58210 },
  emergency: { label: '긴급 방문', baseFee: 72650 },
};

// 장기요양등급별 가산율
const CARE_GRADE_MULTIPLIER: Record<string, number> = {
  '1': 1.3,
  '2': 1.2,
  '3': 1.1,
  '4': 1.05,
  '5': 1.0,
  '인지지원': 1.0,
};

/* ───────────────────── Types ───────────────────── */

interface ClaimVisit {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  actual_duration_min: number | null;
  estimated_duration_min: number | null;
  patient: { id: string; full_name: string; care_grade: string | null };
  nurse: { id: string; full_name: string } | null;
  hasRecord: boolean;
}

type VisitType = 'regular' | 'special' | 'emergency';
type ClaimStatus = 'all' | 'claimable' | 'unclaimed';

/* ───────────────────── Helper ───────────────────── */

function classifyVisitType(visit: ClaimVisit): VisitType {
  const time = visit.scheduled_time;
  if (!time) return 'regular';
  const hour = parseInt(time.slice(0, 2), 10);
  // 야간(18시 이후) 또는 주말은 특별 방문으로 분류
  if (hour >= 18 || hour < 7) return 'emergency';
  return 'regular';
}

function calculateFee(visit: ClaimVisit, visitType: VisitType): number {
  const baseFee = VISIT_FEE_TABLE[visitType].baseFee;
  const grade = visit.patient.care_grade;
  const multiplier = grade ? (CARE_GRADE_MULTIPLIER[grade] ?? 1.0) : 1.0;
  const duration = visit.actual_duration_min ?? visit.estimated_duration_min ?? 60;

  // 60분 기준, 초과 시 비례 가산
  const durationFactor = duration > 60 ? 1 + (duration - 60) * 0.005 : 1;
  return Math.round(baseFee * multiplier * durationFactor);
}

/* ───────────────────── Component ───────────────────── */

export default function ClaimsPage() {
  const { organization } = useAppStore();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [nurseFilter, setNurseFilter] = useState('all');
  const [claimStatusFilter, setClaimStatusFilter] = useState<ClaimStatus>('all');
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | VisitType>('all');

  /* ── Fetch visits with records ── */
  const { data: rawVisits = [], isLoading } = useQuery({
    queryKey: ['claims-visits', organization?.id, startDate, endDate],
    queryFn: async () => {
      if (!organization?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, status,
          actual_duration_min, estimated_duration_min,
          patient:patients(id, full_name, care_grade),
          nurse:staff(id, user_id, profiles:profiles!inner(full_name)),
          visit_record:visit_records(id)
        `)
        .eq('org_id', organization.id)
        .eq('status', 'completed')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      return (data ?? []).map((v: Record<string, unknown>) => {
        const patient = v.patient as { id: string; full_name: string; care_grade: string | null } | null;
        const nurseRaw = v.nurse as { id: string; profiles: { full_name: string } } | null;
        const visitRecordRaw = v.visit_record as { id: string }[] | { id: string } | null;
        const hasRecord = Array.isArray(visitRecordRaw) ? visitRecordRaw.length > 0 : !!visitRecordRaw;

        return {
          id: v.id as string,
          scheduled_date: v.scheduled_date as string,
          scheduled_time: v.scheduled_time as string | null,
          status: v.status as string,
          actual_duration_min: v.actual_duration_min as number | null,
          estimated_duration_min: v.estimated_duration_min as number | null,
          patient: patient ?? { id: '', full_name: '-', care_grade: null },
          nurse: nurseRaw
            ? { id: nurseRaw.id, full_name: nurseRaw.profiles?.full_name ?? '-' }
            : null,
          hasRecord,
        } as ClaimVisit;
      });
    },
    enabled: !!organization?.id,
  });

  /* ── Nurse list for filter ── */
  const nurseList = useMemo(() => {
    const map = new Map<string, string>();
    rawVisits.forEach((v) => {
      if (v.nurse) map.set(v.nurse.id, v.nurse.full_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [rawVisits]);

  /* ── Filtered visits ── */
  const visits = useMemo(() => {
    let list = rawVisits;

    if (nurseFilter !== 'all') {
      list = list.filter((v) => v.nurse?.id === nurseFilter);
    }

    if (claimStatusFilter === 'claimable') {
      list = list.filter((v) => v.hasRecord);
    } else if (claimStatusFilter === 'unclaimed') {
      list = list.filter((v) => !v.hasRecord);
    }

    if (visitTypeFilter !== 'all') {
      list = list.filter((v) => classifyVisitType(v) === visitTypeFilter);
    }

    return list;
  }, [rawVisits, nurseFilter, claimStatusFilter, visitTypeFilter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const claimable = visits.filter((v) => v.hasRecord);
    const unclaimed = visits.filter((v) => !v.hasRecord);

    const totalFee = claimable.reduce((sum, v) => {
      const type = classifyVisitType(v);
      return sum + calculateFee(v, type);
    }, 0);

    const unclaimedFee = unclaimed.reduce((sum, v) => {
      const type = classifyVisitType(v);
      return sum + calculateFee(v, type);
    }, 0);

    const totalDuration = visits.reduce(
      (sum, v) => sum + (v.actual_duration_min ?? v.estimated_duration_min ?? 0), 0
    );

    const patientSet = new Set(visits.map((v) => v.patient.id));

    // Visit type breakdown
    const byType: Record<VisitType, { count: number; fee: number }> = {
      regular: { count: 0, fee: 0 },
      special: { count: 0, fee: 0 },
      emergency: { count: 0, fee: 0 },
    };

    claimable.forEach((v) => {
      const type = classifyVisitType(v);
      byType[type].count++;
      byType[type].fee += calculateFee(v, type);
    });

    return {
      totalVisits: visits.length,
      claimableCount: claimable.length,
      unclaimedCount: unclaimed.length,
      totalFee,
      unclaimedFee,
      totalDuration,
      patientCount: patientSet.size,
      byType,
    };
  }, [visits]);

  /* ── CSV download ── */
  const downloadCSV = useCallback(() => {
    const headers = [
      '날짜', '시간', '환자명', '장기요양등급', '간호사', '방문유형',
      '소요시간(분)', '예상수가(원)', '청구가능',
    ];
    const rows = visits.map((v) => {
      const type = classifyVisitType(v);
      const fee = calculateFee(v, type);
      return [
        v.scheduled_date,
        v.scheduled_time?.slice(0, 5) ?? '',
        v.patient.full_name,
        v.patient.care_grade ?? '',
        v.nurse?.full_name ?? '',
        VISIT_FEE_TABLE[type].label,
        String(v.actual_duration_min ?? v.estimated_duration_min ?? ''),
        String(fee),
        v.hasRecord ? 'O' : 'X',
      ];
    });

    // Summary row
    rows.push([]);
    rows.push(['=== 청구 요약 ===']);
    rows.push(['총 방문 건수', String(stats.totalVisits)]);
    rows.push(['청구 가능', String(stats.claimableCount)]);
    rows.push(['미청구', String(stats.unclaimedCount)]);
    rows.push(['총 청구 예상 금액', `${stats.totalFee.toLocaleString()}원`]);

    const csv = [headers.join(','), ...rows.map((r) => (r as string[]).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `건보청구자료_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [visits, stats, startDate, endDate]);

  /* ── Table columns ── */
  const columns = useMemo(() => [
    {
      key: 'date',
      header: '날짜',
      render: (v: ClaimVisit) => formatDate(v.scheduled_date),
    },
    {
      key: 'time',
      header: '시간',
      render: (v: ClaimVisit) => v.scheduled_time?.slice(0, 5) ?? '-',
    },
    {
      key: 'patient',
      header: '환자',
      render: (v: ClaimVisit) => (
        <span className="font-medium">{v.patient.full_name}</span>
      ),
    },
    {
      key: 'care_grade',
      header: '등급',
      render: (v: ClaimVisit) =>
        v.patient.care_grade ? (
          <Badge variant="primary">{v.patient.care_grade}등급</Badge>
        ) : (
          '-'
        ),
    },
    {
      key: 'nurse',
      header: '간호사',
      render: (v: ClaimVisit) => v.nurse?.full_name ?? '-',
    },
    {
      key: 'visit_type',
      header: '방문유형',
      render: (v: ClaimVisit) => {
        const type = classifyVisitType(v);
        const variant = type === 'emergency' ? 'danger' : type === 'special' ? 'warning' : 'default';
        return <Badge variant={variant}>{VISIT_FEE_TABLE[type].label}</Badge>;
      },
    },
    {
      key: 'duration',
      header: '소요시간',
      render: (v: ClaimVisit) => `${v.actual_duration_min ?? v.estimated_duration_min ?? '-'}분`,
    },
    {
      key: 'fee',
      header: '예상 수가',
      className: 'text-right',
      render: (v: ClaimVisit) => {
        const type = classifyVisitType(v);
        const fee = calculateFee(v, type);
        return <span className="font-medium">{fee.toLocaleString()}원</span>;
      },
    },
    {
      key: 'claim_status',
      header: '청구',
      render: (v: ClaimVisit) =>
        v.hasRecord ? (
          <Badge variant="success">가능</Badge>
        ) : (
          <Badge variant="warning">미기록</Badge>
        ),
    },
  ], []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">건보 청구 자료</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          기간별 방문 기록을 자동 취합하여 급여 청구 참고 자료를 생성합니다.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl bg-tertiary/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" />
        <div>
          <p className="text-sm font-semibold text-tertiary">참고 자료 안내</p>
          <p className="mt-1 text-xs leading-relaxed text-tertiary/80">
            본 자료는 방문 기록을 기반으로 자동 생성된 참고 자료이며, 실제 건강보험 급여 청구는 기관의 책임 하에 진행하셔야 합니다.
            청구 기준 및 수가 적용은 건강보험심사평가원 기준에 따라 별도 확인이 필요합니다.
            표시된 수가는 2026년 참고 금액이며, 실제 수가와 다를 수 있습니다.
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Filter className="mr-2 inline h-5 w-5 text-secondary" />
            조회 조건
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
          <div className="min-w-[150px]">
            <Select
              label="간호사"
              options={[{ value: 'all', label: '전체' }, ...nurseList]}
              value={nurseFilter}
              onChange={(e) => setNurseFilter(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Select
              label="청구 상태"
              options={[
                { value: 'all', label: '전체' },
                { value: 'claimable', label: '청구 가능' },
                { value: 'unclaimed', label: '미청구(미기록)' },
              ]}
              value={claimStatusFilter}
              onChange={(e) => setClaimStatusFilter(e.target.value as ClaimStatus)}
            />
          </div>
          <div className="min-w-[140px]">
            <Select
              label="방문 유형"
              options={[
                { value: 'all', label: '전체' },
                { value: 'regular', label: '정기 방문' },
                { value: 'special', label: '특별 방문' },
                { value: 'emergency', label: '긴급 방문' },
              ]}
              value={visitTypeFilter}
              onChange={(e) => setVisitTypeFilter(e.target.value as 'all' | VisitType)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-primary/5 p-5">
              <div className="mb-1 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <p className="text-xs text-on-surface-variant">총 방문 건수</p>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.totalVisits}건</p>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-5">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <p className="text-xs text-on-surface-variant">총 청구 예상 금액</p>
              </div>
              <p className="text-2xl font-bold text-secondary">
                {stats.totalFee.toLocaleString()}원
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-on-surface-variant" />
                <p className="text-xs text-on-surface-variant">환자 수</p>
              </div>
              <p className="text-2xl font-bold text-on-surface">{stats.patientCount}명</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <div className="mb-1 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-tertiary" />
                <p className="text-xs text-on-surface-variant">미청구 건</p>
              </div>
              <p className={clsx(
                'text-2xl font-bold',
                stats.unclaimedCount > 0 ? 'text-tertiary' : 'text-on-surface'
              )}>
                {stats.unclaimedCount}건
              </p>
              {stats.unclaimedFee > 0 && (
                <p className="mt-0.5 text-xs text-tertiary/70">
                  ~{stats.unclaimedFee.toLocaleString()}원
                </p>
              )}
            </div>
          </div>

          {/* Visit Type Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(Object.entries(VISIT_FEE_TABLE) as [VisitType, { label: string; baseFee: number }][]).map(
              ([type, info]) => {
                const data = stats.byType[type];
                return (
                  <Card key={type}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-on-surface-variant">{info.label}</p>
                        <p className="mt-1 text-xl font-bold text-on-surface">{data.count}건</p>
                        <p className="mt-0.5 text-sm text-on-surface-variant">
                          {data.fee.toLocaleString()}원
                        </p>
                      </div>
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        type === 'regular' && 'bg-primary/10 text-primary',
                        type === 'special' && 'bg-tertiary/10 text-tertiary',
                        type === 'emergency' && 'bg-error/10 text-error'
                      )}>
                        <BarChart3 className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-[11px] text-on-surface-variant">
                        기본 수가: {info.baseFee.toLocaleString()}원
                      </p>
                    </div>
                  </Card>
                );
              }
            )}
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-3">
            <Button onClick={downloadCSV} disabled={visits.length === 0}>
              <Download className="h-4 w-4" />
              CSV 다운로드
            </Button>
            <p className="text-xs text-on-surface-variant">
              {visits.length}건의 방문 기록 | 청구 가능 {stats.claimableCount}건
            </p>
          </div>

          {/* Claims Table */}
          <Card padding={false}>
            <div className="p-6 pb-0">
              <CardHeader>
                <CardTitle>
                  <FileText className="mr-2 inline h-5 w-5 text-on-surface-variant" />
                  방문 기록 상세 ({visits.length}건)
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    청구가능 {stats.claimableCount}
                  </Badge>
                  {stats.unclaimedCount > 0 && (
                    <Badge variant="warning">
                      <XCircle className="mr-1 h-3 w-3" />
                      미청구 {stats.unclaimedCount}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </div>
            {visits.length === 0 ? (
              <div className="py-12 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-on-surface-variant/30" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  해당 기간에 완료된 방문이 없습니다.
                </p>
              </div>
            ) : (
              <Table
                data={visits}
                columns={columns}
                keyExtractor={(v) => v.id}
              />
            )}
          </Card>

          {/* Monthly Claim Summary by Nurse */}
          {nurseList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Users className="mr-2 inline h-5 w-5 text-on-surface-variant" />
                  간호사별 청구 요약
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                        간호사
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                        총 방문
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                        청구 가능
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                        미청구
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                        총 시간(분)
                      </th>
                      <th className="rounded-tr-xl px-4 py-3 text-right font-semibold text-on-surface-variant">
                        예상 청구 금액
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nurseList.map((nurse, idx) => {
                      const nurseVisits = rawVisits.filter((v) => v.nurse?.id === nurse.value);
                      const claimable = nurseVisits.filter((v) => v.hasRecord);
                      const unclaimed = nurseVisits.filter((v) => !v.hasRecord);
                      const totalDur = nurseVisits.reduce(
                        (s, v) => s + (v.actual_duration_min ?? v.estimated_duration_min ?? 0), 0
                      );
                      const fee = claimable.reduce((s, v) => {
                        const t = classifyVisitType(v);
                        return s + calculateFee(v, t);
                      }, 0);

                      return (
                        <tr
                          key={nurse.value}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
                        >
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {nurse.label}
                          </td>
                          <td className="px-4 py-3 text-center text-on-surface">
                            {nurseVisits.length}건
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-secondary">
                            {claimable.length}건
                          </td>
                          <td className="px-4 py-3 text-center">
                            {unclaimed.length > 0 ? (
                              <span className="font-medium text-tertiary">{unclaimed.length}건</span>
                            ) : (
                              <span className="text-on-surface-variant">0건</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-on-surface">
                            {totalDur}분
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-on-surface">
                            {fee.toLocaleString()}원
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="bg-surface-container-low font-semibold">
                      <td className="rounded-bl-xl px-4 py-3 text-on-surface">합계</td>
                      <td className="px-4 py-3 text-center text-on-surface">
                        {rawVisits.length}건
                      </td>
                      <td className="px-4 py-3 text-center text-secondary">
                        {rawVisits.filter((v) => v.hasRecord).length}건
                      </td>
                      <td className="px-4 py-3 text-center text-tertiary">
                        {rawVisits.filter((v) => !v.hasRecord).length}건
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface">
                        {rawVisits.reduce((s, v) => s + (v.actual_duration_min ?? v.estimated_duration_min ?? 0), 0)}분
                      </td>
                      <td className="rounded-br-xl px-4 py-3 text-right text-on-surface">
                        {stats.totalFee.toLocaleString()}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
