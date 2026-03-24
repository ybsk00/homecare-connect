'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import {
  CreditCard,
  CheckCircle,
  Crown,
  Zap,
  Building2,
  ExternalLink,
  AlertCircle,
  Search,
  Users,
  Receipt,
  Clock,
  Ban,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDate } from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

/* ───────────────────── Plan definitions ───────────────────── */

interface PlanInfo {
  name: string;
  price: string;
  monthlyAmount: number;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const plans: Record<string, PlanInfo> = {
  free: {
    name: 'Free',
    price: '무료',
    monthlyAmount: 0,
    features: [
      '환자 5명까지',
      '간호사 2명까지',
      '기본 대시보드',
      '이메일 지원',
    ],
    icon: <Zap className="h-5 w-5" />,
  },
  basic: {
    name: 'Basic',
    price: '월 99,000원',
    monthlyAmount: 99000,
    features: [
      '환자 30명까지',
      '간호사 10명까지',
      '전체 대시보드',
      'AI 리포트 5건/월',
      '채팅 지원',
    ],
    icon: <CreditCard className="h-5 w-5" />,
    popular: true,
  },
  pro: {
    name: 'Pro',
    price: '월 249,000원',
    monthlyAmount: 249000,
    features: [
      '환자 100명까지',
      '간호사 무제한',
      '전체 기능',
      'AI 리포트 무제한',
      '동선 최적화',
      '전화 지원',
    ],
    icon: <Crown className="h-5 w-5" />,
  },
  enterprise: {
    name: 'Enterprise',
    price: '문의',
    monthlyAmount: 0,
    features: [
      '환자 무제한',
      '간호사 무제한',
      '전체 기능',
      'AI 리포트 무제한',
      '전용 서버',
      '전담 매니저',
      'SLA 보장',
    ],
    icon: <Building2 className="h-5 w-5" />,
  },
};

const paymentStatusLabels: Record<string, string> = {
  paid: '결제완료',
  failed: '결제실패',
  refunded: '환불',
  pending: '대기중',
};

/* ───────────────────── Visit billing type ───────────────────── */

interface VisitBillingRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  actual_duration_min: number | null;
  estimated_duration_min: number | null;
  patient: { id: string; full_name: string; care_grade: string | null };
  nurse: { user: { full_name: string } } | null;
  visit_record: { id: string } | null;
}

/* ───────────────────── Component ───────────────────── */

export default function BillingPage() {
  const { organization } = useAppStore();
  const [activeTab, setActiveTab] = useState<'subscription' | 'patient-billing'>('subscription');
  const [patientSearch, setPatientSearch] = useState('');
  const [billingFilter, setBillingFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  /* ── Subscription query ── */
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', organization.id)
        .eq('status', 'active')
        .single();
      return data as Tables<'subscriptions'> | null;
    },
    enabled: !!organization?.id,
  });

  /* ── Payment history query ── */
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-history', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('payment_history')
        .select('*')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as Tables<'payment_history'>[];
    },
    enabled: !!organization?.id,
  });

  /* ── Patient billing visits query ── */
  const { data: billingVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['billing-visits', organization?.id, startDate, endDate],
    queryFn: async () => {
      if (!organization?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, status,
          actual_duration_min, estimated_duration_min,
          patient:patients(id, full_name, care_grade),
          nurse:staff(user_id, profiles:profiles!inner(full_name)),
          visit_record:visit_records(id)
        `)
        .eq('org_id', organization.id)
        .in('status', ['completed', 'checked_out'])
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: false });

      return (data ?? []).map((v: Record<string, unknown>) => {
        const patient = v.patient as { id: string; full_name: string; care_grade: string | null } | null;
        const nurseRaw = v.nurse as { profiles: { full_name: string } } | null;
        const visitRecordRaw = v.visit_record as { id: string }[] | { id: string } | null;
        const visitRecord = Array.isArray(visitRecordRaw) ? visitRecordRaw[0] ?? null : visitRecordRaw;

        return {
          id: v.id as string,
          scheduled_date: v.scheduled_date as string,
          scheduled_time: v.scheduled_time as string | null,
          status: v.status as string,
          actual_duration_min: v.actual_duration_min as number | null,
          estimated_duration_min: v.estimated_duration_min as number | null,
          patient: patient ?? { id: '', full_name: '-', care_grade: null },
          nurse: nurseRaw ? { user: { full_name: nurseRaw.profiles?.full_name ?? '-' } } : null,
          visit_record: visitRecord,
        } as VisitBillingRow;
      });
    },
    enabled: !!organization?.id,
  });

  /* ── Derived data ── */
  const currentPlan = subscription?.plan || organization?.subscription_plan || 'free';
  const hasPaymentSetup = !!subscription?.toss_billing_key;

  // Group visits by patient for billing view
  const patientBillingMap = useMemo(() => {
    const map = new Map<string, {
      patientId: string;
      patientName: string;
      careGrade: string | null;
      totalVisits: number;
      completedVisits: number;
      recordedVisits: number;
      unrecordedVisits: number;
      totalDuration: number;
      visits: VisitBillingRow[];
    }>();

    billingVisits.forEach((v) => {
      const key = v.patient.id;
      if (!map.has(key)) {
        map.set(key, {
          patientId: key,
          patientName: v.patient.full_name,
          careGrade: v.patient.care_grade,
          totalVisits: 0,
          completedVisits: 0,
          recordedVisits: 0,
          unrecordedVisits: 0,
          totalDuration: 0,
          visits: [],
        });
      }
      const entry = map.get(key)!;
      entry.totalVisits++;
      entry.completedVisits++;
      if (v.visit_record) {
        entry.recordedVisits++;
      } else {
        entry.unrecordedVisits++;
      }
      entry.totalDuration += v.actual_duration_min ?? v.estimated_duration_min ?? 0;
      entry.visits.push(v);
    });

    return map;
  }, [billingVisits]);

  const patientBillingList = useMemo(() => {
    let list = Array.from(patientBillingMap.values());

    if (patientSearch) {
      list = list.filter((p) => p.patientName.includes(patientSearch));
    }

    if (billingFilter === 'unpaid') {
      list = list.filter((p) => p.unrecordedVisits > 0);
    } else if (billingFilter === 'paid') {
      list = list.filter((p) => p.unrecordedVisits === 0);
    }

    return list;
  }, [patientBillingMap, patientSearch, billingFilter]);

  const totalUnrecorded = useMemo(
    () => patientBillingList.reduce((sum, p) => sum + p.unrecordedVisits, 0),
    [patientBillingList]
  );

  /* ── Payment summary ── */
  const paymentSummary = useMemo(() => {
    const totalPaid = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const totalFailed = payments.filter((p) => p.status === 'failed').length;
    const lastPayment = payments.find((p) => p.status === 'paid');
    return { totalPaid, totalFailed, lastPayment };
  }, [payments]);

  if (subLoading) return <Loading />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">결제 / 수납 관리</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          구독 플랜 관리, 결제 내역, 환자별 수납 내역을 확인합니다.
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-1 rounded-xl bg-surface-container-low p-1">
        <button
          onClick={() => setActiveTab('subscription')}
          className={clsx(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            activeTab === 'subscription'
              ? 'bg-white text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <CreditCard className="mr-2 inline h-4 w-4" />
          구독 / 결제
        </button>
        <button
          onClick={() => setActiveTab('patient-billing')}
          className={clsx(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            activeTab === 'patient-billing'
              ? 'bg-white text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <Receipt className="mr-2 inline h-4 w-4" />
          환자 수납
        </button>
      </div>

      {activeTab === 'subscription' && (
        <>
          {/* Payment Setup Warning */}
          {!hasPaymentSetup && currentPlan !== 'free' && (
            <div className="flex items-start gap-3 rounded-2xl bg-tertiary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" />
              <div>
                <p className="text-sm font-semibold text-tertiary">결제 설정이 필요합니다</p>
                <p className="mt-1 text-xs leading-relaxed text-tertiary/80">
                  토스페이먼츠 자동결제를 위해 카드 등록이 필요합니다.
                  결제 수단을 등록하지 않으면 다음 결제일에 구독이 중단될 수 있습니다.
                </p>
                <Button variant="outline" className="mt-3" size="sm">
                  결제 수단 등록
                </Button>
              </div>
            </div>
          )}

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>현재 플랜</CardTitle>
              {subscription ? (
                <Badge variant="success">활성</Badge>
              ) : (
                <Badge variant="default">미구독</Badge>
              )}
            </CardHeader>

            {subscription ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white">
                    {plans[currentPlan]?.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-on-surface">
                      {plans[currentPlan]?.name} 플랜
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {subscription.billing_cycle === 'monthly' ? '월간' : '연간'}{' '}
                      결제 | 다음 결제일:{' '}
                      {subscription.next_billing_date
                        ? formatDate(subscription.next_billing_date)
                        : '-'}
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-on-surface">
                  {plans[currentPlan]?.price}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="text-sm text-on-surface-variant">
                  현재 Free 플랜을 사용 중입니다. 업그레이드하여 더 많은 기능을 이용하세요.
                </p>
              </div>
            )}
          </Card>

          {/* Payment Summary Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-primary/5 p-5">
              <p className="text-xs text-on-surface-variant">현재 플랜</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {plans[currentPlan]?.name}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/5 p-5">
              <p className="text-xs text-on-surface-variant">총 결제 금액</p>
              <p className="mt-1 text-2xl font-bold text-secondary">
                {paymentSummary.totalPaid.toLocaleString()}원
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-xs text-on-surface-variant">최근 결제일</p>
              <p className="mt-1 text-2xl font-bold text-on-surface">
                {paymentSummary.lastPayment?.paid_at
                  ? formatDate(paymentSummary.lastPayment.paid_at)
                  : '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-xs text-on-surface-variant">결제 실패</p>
              <p className={clsx(
                'mt-1 text-2xl font-bold',
                paymentSummary.totalFailed > 0 ? 'text-error' : 'text-on-surface'
              )}>
                {paymentSummary.totalFailed}건
              </p>
            </div>
          </div>

          {/* Plan Comparison */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-on-surface">플랜 비교</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(plans).map(([key, plan]) => (
                <div
                  key={key}
                  className={clsx(
                    'relative rounded-2xl bg-white p-6 transition-all',
                    key === currentPlan
                      ? 'ring-2 ring-primary shadow-[0_10px_40px_rgba(0,32,69,0.1)]'
                      : 'hover:shadow-[0_10px_40px_rgba(24,28,30,0.05)]'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-1 text-xs font-bold text-white">
                        인기
                      </span>
                    </div>
                  )}
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant">
                      {plan.icon}
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">{plan.name}</h3>
                  </div>
                  <p className="mb-5 text-2xl font-bold text-on-surface">{plan.price}</p>
                  <ul className="mb-6 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-sm text-on-surface-variant"
                      >
                        <CheckCircle className="h-4 w-4 shrink-0 text-secondary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {key === currentPlan ? (
                    <Button variant="secondary" className="w-full" disabled>
                      현재 플랜
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? 'gradient' : 'outline'}
                      className="w-full"
                    >
                      {key === 'enterprise' ? '문의하기' : '업그레이드'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>결제 내역</CardTitle>
              <Badge variant="default">{payments.length}건</Badge>
            </CardHeader>
            {paymentsLoading ? (
              <Loading size="sm" />
            ) : payments.length === 0 ? (
              <div className="py-12 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-on-surface-variant/30" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  결제 내역이 없습니다.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                        날짜
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">
                        설명
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                        금액
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                        상태
                      </th>
                      <th className="rounded-tr-xl px-4 py-3 text-center font-semibold text-on-surface-variant">
                        영수증
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, idx) => (
                      <tr
                        key={payment.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
                      >
                        <td className="px-4 py-3 text-on-surface">
                          {payment.paid_at
                            ? formatDate(payment.paid_at)
                            : formatDate(payment.created_at)}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {plans[currentPlan]?.name ?? '구독'} 플랜 결제
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-on-surface">
                          {payment.amount.toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={getStatusBadgeVariant(payment.status)}>
                            {paymentStatusLabels[payment.status] ?? payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {payment.receipt_url ? (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-container"
                            >
                              보기 <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-on-surface-variant">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'patient-billing' && (
        <>
          {/* Period & Filter */}
          <Card>
            <CardHeader>
              <CardTitle>수납 조회</CardTitle>
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
              <div className="min-w-[140px]">
                <Select
                  label="수납 상태"
                  options={[
                    { value: 'all', label: '전체' },
                    { value: 'unpaid', label: '미수납' },
                    { value: 'paid', label: '수납완료' },
                  ]}
                  value={billingFilter}
                  onChange={(e) => setBillingFilter(e.target.value as 'all' | 'unpaid' | 'paid')}
                />
              </div>
              <div className="relative min-w-[200px]">
                <label className="mb-1 block text-xs text-on-surface-variant">환자 검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="환자명 검색"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="block w-full rounded-xl bg-surface-container-highest py-2.5 pl-9 pr-4 text-sm text-on-surface transition-all focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>
          </Card>

          {visitsLoading ? (
            <Loading />
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl bg-primary/5 p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="text-xs text-on-surface-variant">환자 수</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{patientBillingList.length}명</p>
                </div>
                <div className="rounded-2xl bg-secondary/5 p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <p className="text-xs text-on-surface-variant">완료 방문</p>
                  </div>
                  <p className="text-2xl font-bold text-secondary">{billingVisits.length}건</p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-on-surface-variant" />
                    <p className="text-xs text-on-surface-variant">총 소요시간</p>
                  </div>
                  <p className="text-2xl font-bold text-on-surface">
                    {billingVisits.reduce((s, v) => s + (v.actual_duration_min ?? v.estimated_duration_min ?? 0), 0)}분
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Ban className="h-4 w-4 text-tertiary" />
                    <p className="text-xs text-on-surface-variant">미기록 방문</p>
                  </div>
                  <p className={clsx(
                    'text-2xl font-bold',
                    totalUnrecorded > 0 ? 'text-tertiary' : 'text-on-surface'
                  )}>
                    {totalUnrecorded}건
                  </p>
                </div>
              </div>

              {/* Patient Billing Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Receipt className="mr-2 inline h-5 w-5 text-on-surface-variant" />
                    환자별 수납 내역
                  </CardTitle>
                  <Badge variant="default">{patientBillingList.length}명</Badge>
                </CardHeader>

                {patientBillingList.length === 0 ? (
                  <div className="py-12 text-center">
                    <Receipt className="mx-auto h-12 w-12 text-on-surface-variant/30" />
                    <p className="mt-3 text-sm text-on-surface-variant">
                      해당 기간에 수납 대상 방문이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                            환자명
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                            등급
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                            방문 횟수
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                            기록 완료
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">
                            미기록
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                            총 시간(분)
                          </th>
                          <th className="rounded-tr-xl px-4 py-3 text-center font-semibold text-on-surface-variant">
                            상태
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientBillingList.map((row, idx) => (
                          <tr
                            key={row.patientId}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
                          >
                            <td className="px-4 py-3 font-medium text-on-surface">
                              {row.patientName}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.careGrade ? (
                                <Badge variant="primary">{row.careGrade}등급</Badge>
                              ) : (
                                <span className="text-on-surface-variant">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-on-surface">
                              {row.totalVisits}회
                            </td>
                            <td className="px-4 py-3 text-center text-secondary font-medium">
                              {row.recordedVisits}건
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.unrecordedVisits > 0 ? (
                                <span className="font-medium text-tertiary">{row.unrecordedVisits}건</span>
                              ) : (
                                <span className="text-on-surface-variant">0건</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-on-surface">
                              {row.totalDuration}분
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.unrecordedVisits > 0 ? (
                                <Badge variant="warning">미수납</Badge>
                              ) : (
                                <Badge variant="success">완료</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Unpaid List */}
              {totalUnrecorded > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <AlertCircle className="mr-2 inline h-5 w-5 text-tertiary" />
                      미수납 방문 상세
                    </CardTitle>
                    <Badge variant="warning">{totalUnrecorded}건</Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                            날짜
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">
                            시간
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">
                            환자
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-on-surface-variant">
                            간호사
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                            소요시간
                          </th>
                          <th className="rounded-tr-xl px-4 py-3 text-center font-semibold text-on-surface-variant">
                            기록
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingVisits
                          .filter((v) => !v.visit_record)
                          .map((v, idx) => (
                            <tr
                              key={v.id}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
                            >
                              <td className="px-4 py-3 text-on-surface">
                                {formatDate(v.scheduled_date)}
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant">
                                {v.scheduled_time?.slice(0, 5) ?? '-'}
                              </td>
                              <td className="px-4 py-3 font-medium text-on-surface">
                                {v.patient.full_name}
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant">
                                {v.nurse?.user?.full_name ?? '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-on-surface">
                                {v.actual_duration_min ?? v.estimated_duration_min ?? '-'}분
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="warning">미기록</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
