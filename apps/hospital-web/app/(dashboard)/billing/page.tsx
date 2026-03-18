'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import {
  CreditCard,
  CheckCircle,
  Crown,
  Zap,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Tables } from '@homecare/shared-types';

interface PlanInfo {
  name: string;
  price: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const plans: Record<string, PlanInfo> = {
  free: {
    name: 'Free',
    price: '무료',
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
};

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) return null;

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', org.id)
        .eq('status', 'active')
        .single();

      return data as Tables<'subscriptions'> | null;
    },
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) return [];

      const { data } = await supabase
        .from('payment_history')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return (data || []) as Tables<'payment_history'>[];
    },
  });

  const currentPlan = subscription?.plan || 'free';

  if (subLoading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">결제 관리</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          구독 플랜 및 결제 내역을 관리합니다.
        </p>
      </div>

      {/* Current plan */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>현재 플랜</CardTitle>
            <Badge variant="success">활성</Badge>
          </CardHeader>
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
                  {subscription.next_billing_date || '-'}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-on-surface">
              {plans[currentPlan]?.price}
            </p>
          </div>
        </Card>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="mb-6 text-lg font-semibold text-on-surface">
          플랜 비교
        </h2>
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
                <h3 className="text-lg font-bold text-on-surface">
                  {plan.name}
                </h3>
              </div>
              <p className="mb-5 text-2xl font-bold text-on-surface">
                {plan.price}
              </p>
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

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
        </CardHeader>
        {paymentsLoading ? (
          <Loading size="sm" />
        ) : payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            결제 내역이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                    날짜
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
                        ? new Date(payment.paid_at).toLocaleDateString('ko-KR')
                        : new Date(payment.created_at).toLocaleDateString(
                            'ko-KR'
                          )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-on-surface">
                      {payment.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {paymentStatusLabels[payment.status]}
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
    </div>
  );
}
