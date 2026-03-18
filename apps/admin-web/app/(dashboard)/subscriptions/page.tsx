'use client';

import { useState, useEffect } from 'react';
import AdminTopBar from '@/components/layout/AdminTopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@homecare/shared-utils';
import { AlertTriangle } from 'lucide-react';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'navy' | 'teal' | 'brown' | 'purple';

interface Subscription {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string | null;
  trial_ends_at: string | null;
  started_at: string;
  organization?: {
    name: string;
  };
}

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  active: { label: '활성', color: 'green' },
  past_due: { label: '결제 실패', color: 'red' },
  cancelled: { label: '해지', color: 'gray' },
  trial: { label: '체험', color: 'teal' },
};

const planConfig: Record<string, { label: string; color: BadgeColor }> = {
  free: { label: 'Free', color: 'gray' },
  basic: { label: 'Basic', color: 'teal' },
  pro: { label: 'Pro', color: 'navy' },
  enterprise: { label: 'Enterprise', color: 'purple' },
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          organization:organizations (name)
        `)
        .order('status', { ascending: true })
        .order('next_billing_date', { ascending: true });

      if (error) throw error;
      setSubscriptions((data as unknown as Subscription[]) || []);
    } catch (err) {
      console.error('구독 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanAdjust() {
    if (!selectedSub || !newPlan) return;
    setAdjustLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const planPricing: Record<string, number> = {
        free: 0,
        basic: 99000,
        pro: 299000,
        enterprise: 599000,
      };

      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: newPlan,
          amount: planPricing[newPlan] ?? 0,
        })
        .eq('id', selectedSub.id);

      if (error) throw error;

      await supabase
        .from('organizations')
        .update({ subscription_plan: newPlan })
        .eq('id', selectedSub.org_id);

      setShowPlanModal(false);
      setSelectedSub(null);
      setNewPlan('');
      fetchSubscriptions();
    } catch (err) {
      console.error('플랜 변경 실패:', err);
    } finally {
      setAdjustLoading(false);
    }
  }

  const failedPayments = subscriptions.filter((s) => s.status === 'past_due');
  const normalSubscriptions = subscriptions.filter((s) => s.status !== 'past_due');

  return (
    <div>
      <AdminTopBar title="구독 관리" subtitle="기관별 구독 현황 및 결제 상태를 관리합니다." />
      <div className="p-8 space-y-8">
        {/* Failed Payments Alert */}
        {failedPayments.length > 0 && (
          <div className="p-6 bg-tertiary-50 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <AlertTriangle className="w-5 h-5 text-tertiary-500" />
              <h3 className="font-bold text-tertiary-700">
                결제 실패 ({failedPayments.length}건)
              </h3>
            </div>
            <div className="space-y-2">
              {failedPayments.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl"
                >
                  <div>
                    <p className="text-sm font-semibold text-primary-800">
                      {sub.organization?.name || '알 수 없음'}
                    </p>
                    <p className="text-[12px] text-primary-400 mt-0.5">
                      {planConfig[sub.plan]?.label} - {formatCurrency(sub.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color="red">결제 실패</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSub(sub);
                        setNewPlan(sub.plan);
                        setShowPlanModal(true);
                      }}
                    >
                      관리
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Table */}
        <Card padding={false}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-primary-50/50">
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">기관명</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">플랜</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">결제주기</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">금액</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">다음 결제일</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">시작일</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {normalSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-sm text-primary-300">
                        구독 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    normalSubscriptions.map((sub, idx) => {
                      const status = statusConfig[sub.status] || { label: sub.status, color: 'gray' as BadgeColor };
                      const plan = planConfig[sub.plan] || { label: sub.plan, color: 'gray' as BadgeColor };

                      return (
                        <tr key={sub.id} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-primary-800">
                            {sub.organization?.name || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={plan.color}>{plan.label}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={status.color}>{status.label}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {sub.billing_cycle === 'monthly' ? '월간' : '연간'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {formatCurrency(sub.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {sub.next_billing_date ? formatDate(sub.next_billing_date) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {formatDate(sub.started_at)}
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedSub(sub);
                                setNewPlan(sub.plan);
                                setShowPlanModal(true);
                              }}
                            >
                              플랜 조정
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Plan Adjust Modal */}
        <Modal
          open={showPlanModal}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedSub(null);
          }}
          title="수동 플랜 조정"
          size="sm"
        >
          {selectedSub && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">기관명</p>
                <p className="text-sm font-semibold text-primary-800">
                  {selectedSub.organization?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1.5">현재 플랜</p>
                <Badge color={planConfig[selectedSub.plan]?.color || 'gray'}>
                  {planConfig[selectedSub.plan]?.label || selectedSub.plan}
                </Badge>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  변경할 플랜
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                >
                  <option value="free">Free (무료)</option>
                  <option value="basic">Basic (99,000원/월)</option>
                  <option value="pro">Pro (299,000원/월)</option>
                  <option value="enterprise">Enterprise (599,000원/월)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPlanModal(false);
                    setSelectedSub(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  loading={adjustLoading}
                  onClick={handlePlanAdjust}
                >
                  변경
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
