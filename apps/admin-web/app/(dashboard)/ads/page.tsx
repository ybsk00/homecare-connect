'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTopBar from '@/components/layout/AdminTopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@homecare/shared-utils';
import { clsx } from 'clsx';
import { DollarSign, BarChart3, CheckCircle, CheckCircle2 } from 'lucide-react';
import type { BadgeColor, AdvertisementView as Advertisement } from '@homecare/shared-types';

type TabKey = 'pending' | 'approved' | 'rejected';

const adTypeLabels: Record<string, string> = {
  search_top: '검색 상위 노출',
  profile_boost: '프로필 부스트',
  area_exclusive: '지역 독점',
};

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  pending: { label: '심사대기', color: 'yellow' },
  approved: { label: '승인', color: 'green' },
  rejected: { label: '거절', color: 'red' },
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '심사대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
];

const adRegulationChecklist = [
  '의료법 제56조 의료광고 규정 준수 여부',
  '허위/과대 광고 여부 확인',
  '치료 효과 보장 문구 미포함 확인',
  '환자 후기/수기 사용 적정성 확인',
  '의료인 경력/학력 사실 확인',
  '비급여 진료비 표시 적정성 확인',
  '심의 필요 광고 여부 확인 (심의번호)',
];

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(adRegulationChecklist.length).fill(false));
  const queryClient = useQueryClient();

  const { data: ads = [], isLoading: loading, error } = useQuery({
    queryKey: ['admin-ads', activeTab],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('advertisements')
        .select('*, organization:organizations (name)')
        .eq('review_status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Advertisement[]) || [];
    },
  });

  const { data: counts = { pending: 0, approved: 0, rejected: 0 } } = useQuery({
    queryKey: ['admin-ads-counts'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const countPromises = tabs.map(async (tab) => {
        const { count } = await supabase
          .from('advertisements')
          .select('*', { count: 'exact', head: true })
          .eq('review_status', tab.key);
        return { key: tab.key, count: count ?? 0 };
      });

      const countResults = await Promise.all(countPromises);
      const newCounts: Record<TabKey, number> = { pending: 0, approved: 0, rejected: 0 };
      countResults.forEach((r) => { newCounts[r.key] = r.count; });
      return newCounts;
    },
  });

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ['admin-ads-revenue'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: activeAds } = await supabase
        .from('advertisements')
        .select('monthly_fee')
        .eq('review_status', 'approved')
        .eq('is_active', true);

      return (activeAds as { monthly_fee: number | null }[] | null)?.reduce((sum: number, ad: { monthly_fee: number | null }) => sum + (ad.monthly_fee ?? 0), 0) ?? 0;
    },
  });

  function invalidateAds() {
    queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
    queryClient.invalidateQueries({ queryKey: ['admin-ads-counts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-ads-revenue'] });
  }

  async function handleApprove(adId: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('advertisements')
        .update({
          review_status: 'approved',
          reviewed_at: new Date().toISOString(),
          is_active: true,
        } as never)
        .eq('id', adId);
      setShowReviewModal(false);
      setSelectedAd(null);
      setCheckedItems(new Array(adRegulationChecklist.length).fill(false));
      invalidateAds();
    } catch (err) {
      console.error('광고 승인 실패:', err);
    }
  }

  async function handleReject(adId: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('advertisements')
        .update({
          review_status: 'rejected',
          reviewed_at: new Date().toISOString(),
          is_active: false,
        } as never)
        .eq('id', adId);
      setShowReviewModal(false);
      setSelectedAd(null);
      setCheckedItems(new Array(adRegulationChecklist.length).fill(false));
      invalidateAds();
    } catch (err) {
      console.error('광고 거절 실패:', err);
    }
  }

  const allChecked = checkedItems.every(Boolean);

  return (
    <div>
      <AdminTopBar title="광고 관리" subtitle="의료광고 심사 및 매출 현황을 관리합니다." />
      <div className="p-8 space-y-8">
        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-secondary-50 rounded-2xl">
                <DollarSign className="w-6 h-6 text-secondary-700" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">월간 광고 매출</p>
                <p className="text-xl font-bold text-primary-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-primary-100 rounded-2xl">
                <BarChart3 className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">활성 광고 수</p>
                <p className="text-xl font-bold text-primary-900">{counts.approved}개</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-warning-50 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-warning-600" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">심사 대기</p>
                <p className="text-xl font-bold text-primary-900">{counts.pending}건</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tonal Pill Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200',
                activeTab === tab.key
                  ? 'gradient-button text-white shadow-sm'
                  : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60',
              )}
            >
              {tab.label}
              <span className={clsx(
                'ml-2 px-2 py-0.5 rounded-full text-[11px]',
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-400',
              )}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-primary-400">
              <p className="text-sm font-semibold text-danger-600 mb-2">광고 목록을 불러오지 못했습니다.</p>
              <p className="text-xs text-primary-300">{(error as Error).message}</p>
            </div>
          </Card>
        )}

        {/* Ads Table */}
        {!error && <Card padding={false}>
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
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">광고 유형</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">대상 지역</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">월 요금</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">기간</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-primary-300">
                        광고 요청이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    ads.map((ad, idx) => {
                      const status = statusConfig[ad.review_status] || { label: ad.review_status, color: 'gray' as BadgeColor };
                      return (
                        <tr key={ad.id} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-primary-800">
                            {ad.organization?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {adTypeLabels[ad.ad_type] || ad.ad_type}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {ad.target_area || '전국'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {ad.monthly_fee ? formatCurrency(ad.monthly_fee) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {ad.start_date && ad.end_date
                              ? `${formatDate(ad.start_date)} ~ ${formatDate(ad.end_date)}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={status.color}>{status.label}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            {ad.review_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setShowReviewModal(true);
                                  setCheckedItems(new Array(adRegulationChecklist.length).fill(false));
                                }}
                              >
                                심사
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>}

        {/* Review Modal with Regulation Checklist */}
        <Modal
          open={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAd(null);
          }}
          title="광고 심사"
          size="lg"
        >
          {selectedAd && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">기관명</p>
                  <p className="text-sm font-semibold text-primary-800">{selectedAd.organization?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">광고 유형</p>
                  <p className="text-sm text-primary-600">{adTypeLabels[selectedAd.ad_type] || selectedAd.ad_type}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">대상 지역</p>
                  <p className="text-sm text-primary-600">{selectedAd.target_area || '전국'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">월 요금</p>
                  <p className="text-sm text-primary-600">{selectedAd.monthly_fee ? formatCurrency(selectedAd.monthly_fee) : '-'}</p>
                </div>
              </div>

              <div className="p-6 bg-tertiary-50 rounded-2xl">
                <h4 className="text-[13px] font-bold text-tertiary-700 mb-4">
                  의료광고 규정 체크리스트
                </h4>
                <div className="space-y-3">
                  {adRegulationChecklist.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-3 text-sm text-primary-600 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checkedItems[idx]}
                        onChange={(e) => {
                          const updated = [...checkedItems];
                          updated[idx] = e.target.checked;
                          setCheckedItems(updated);
                        }}
                        className="w-5 h-5 rounded-lg bg-white text-secondary-600 focus:ring-secondary-500/30"
                      />
                      <span className="group-hover:text-primary-800 transition-colors">{item}</span>
                      {checkedItems[idx] && <CheckCircle2 className="w-4 h-4 text-secondary-500 ml-auto shrink-0" />}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => handleReject(selectedAd.id)}>
                  거절
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(selectedAd.id)}
                  disabled={!allChecked}
                >
                  {allChecked ? '승인' : '체크리스트 완료 후 승인 가능'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
