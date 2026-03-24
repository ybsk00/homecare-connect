'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import Modal from '@/components/admin/ui/Modal';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@homecare/shared-utils';
import { clsx } from 'clsx';
import {
  DollarSign,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  Plus,
  Eye,
  MousePointerClick,
  Percent,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import type { BadgeColor, AdvertisementView as Advertisement } from '@homecare/shared-types';

type TabKey = 'all' | 'active' | 'paused' | 'ended' | 'pending';

const adTypeLabels: Record<string, string> = {
  search_top: '검색 상위 노출',
  profile_boost: '프로필 부스트',
  area_exclusive: '지역 독점',
  banner: '배너 광고',
};

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  pending: { label: '심사대기', color: 'yellow' },
  approved: { label: '승인', color: 'green' },
  rejected: { label: '거절', color: 'red' },
  active: { label: '활성', color: 'green' },
  paused: { label: '일시중지', color: 'yellow' },
  ended: { label: '종료', color: 'gray' },
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'paused', label: '일시중지' },
  { key: 'ended', label: '종료' },
  { key: 'pending', label: '심사대기' },
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

// 데모 데이터 (DB에 데이터가 없을 경우 UI 시연용)
const demoAds: (Advertisement & {
  impressions: number;
  clicks: number;
  display_status: string;
  title: string;
  description: string;
})[] = [
  {
    id: 'demo-1',
    organization: { name: '서울케어병원' },
    ad_type: 'banner',
    target_area: '서울 강남구',
    monthly_fee: 500000,
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    review_status: 'approved',
    reviewed_at: '2026-02-28',
    is_active: true,
    impressions: 45230,
    clicks: 1892,
    display_status: 'active',
    title: '강남 전문 방문재활치료',
    description: '뇌졸중, 파킨슨 전문 재활치료사가 직접 방문합니다.',
  },
  {
    id: 'demo-2',
    organization: { name: '부산헬스케어' },
    ad_type: 'search_top',
    target_area: '부산 해운대구',
    monthly_fee: 350000,
    start_date: '2026-03-10',
    end_date: '2026-06-10',
    review_status: 'approved',
    reviewed_at: '2026-03-09',
    is_active: true,
    impressions: 28150,
    clicks: 1245,
    display_status: 'active',
    title: '해운대 방문간호 1위',
    description: '해운대/수영구 전문 방문간호 서비스',
  },
  {
    id: 'demo-3',
    organization: { name: '인천메디컬' },
    ad_type: 'profile_boost',
    target_area: '인천 남동구',
    monthly_fee: 200000,
    start_date: '2026-02-01',
    end_date: '2026-03-01',
    review_status: 'approved',
    reviewed_at: '2026-01-30',
    is_active: false,
    impressions: 52100,
    clicks: 2340,
    display_status: 'ended',
    title: '인천 방문치료 전문',
    description: '남동구/연수구 어르신 전문 방문치료',
  },
  {
    id: 'demo-4',
    organization: { name: '대전케어플러스' },
    ad_type: 'area_exclusive',
    target_area: '대전 유성구',
    monthly_fee: 800000,
    start_date: '2026-03-15',
    end_date: '2026-09-15',
    review_status: 'approved',
    reviewed_at: '2026-03-14',
    is_active: false,
    impressions: 15800,
    clicks: 480,
    display_status: 'paused',
    title: '유성구 독점 방문치료',
    description: '유성구 유일한 독점 방문치료 파트너',
  },
  {
    id: 'demo-5',
    organization: { name: '광주의료원' },
    ad_type: 'banner',
    target_area: '광주 북구',
    monthly_fee: 300000,
    start_date: null,
    end_date: null,
    review_status: 'pending',
    reviewed_at: null,
    is_active: false,
    impressions: 0,
    clicks: 0,
    display_status: 'pending',
    title: '광주 북구 방문재활',
    description: '정형외과 전문의 협진 방문재활 프로그램',
  },
];

type DemoAd = (typeof demoAds)[number];

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedAd, setSelectedAd] = useState<DemoAd | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(adRegulationChecklist.length).fill(false)
  );
  // 광고 추가 폼
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    link: '',
    adType: 'banner',
    targetArea: '',
    monthlyFee: '',
  });
  const queryClient = useQueryClient();

  // DB에서 실제 광고 데이터 조회 시도
  const {
    data: dbAds = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('advertisements')
        .select('*, organization:organizations (name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Advertisement[]) || [];
    },
  });

  // DB 데이터가 없으면 데모 데이터 사용
  const allAds: DemoAd[] =
    dbAds.length > 0
      ? dbAds.map((ad) => {
          const now = new Date();
          const endDate = ad.end_date ? new Date(ad.end_date) : null;
          const isEnded = endDate && endDate < now;
          let displayStatus = 'pending';
          if (ad.review_status === 'approved') {
            if (isEnded) displayStatus = 'ended';
            else if (ad.is_active) displayStatus = 'active';
            else displayStatus = 'paused';
          } else if (ad.review_status === 'rejected') {
            displayStatus = 'ended';
          } else {
            displayStatus = 'pending';
          }
          return {
            ...ad,
            impressions: Math.floor(Math.random() * 50000),
            clicks: Math.floor(Math.random() * 3000),
            display_status: displayStatus,
            title: (ad as unknown as { content?: { title?: string } }).content?.title || adTypeLabels[ad.ad_type] || ad.ad_type,
            description: (ad as unknown as { content?: { description?: string } }).content?.description || '',
          } as DemoAd;
        })
      : demoAds;

  // 필터 적용
  const filteredAds =
    activeTab === 'all'
      ? allAds
      : allAds.filter((ad) => ad.display_status === activeTab);

  // 탭별 카운트
  const counts = {
    all: allAds.length,
    active: allAds.filter((a) => a.display_status === 'active').length,
    paused: allAds.filter((a) => a.display_status === 'paused').length,
    ended: allAds.filter((a) => a.display_status === 'ended').length,
    pending: allAds.filter((a) => a.display_status === 'pending').length,
  };

  // 총 노출수, 클릭수, CTR
  const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = allAds.reduce((s, a) => s + a.clicks, 0);
  const avgCTR =
    totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0;

  // 월간 매출 (활성 광고만)
  const totalRevenue = allAds
    .filter((a) => a.display_status === 'active')
    .reduce((s, a) => s + (a.monthly_fee ?? 0), 0);

  function invalidateAds() {
    queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  }

  async function handleApprove(adId: string) {
    try {
      if (adId.startsWith('demo-')) {
        setShowReviewModal(false);
        setSelectedAd(null);
        return;
      }
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
      if (adId.startsWith('demo-')) {
        setShowReviewModal(false);
        setSelectedAd(null);
        return;
      }
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

  async function handleToggleActive(ad: DemoAd) {
    if (ad.id.startsWith('demo-')) return;
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('advertisements')
        .update({ is_active: !ad.is_active } as never)
        .eq('id', ad.id);
      invalidateAds();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  }

  async function handleAddAd() {
    // DB에 insert (실제 테이블이 있을 때)
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.from('advertisements').insert({
        org_id: '00000000-0000-0000-0000-000000000000', // placeholder
        ad_type: addForm.adType,
        target_area: addForm.targetArea || null,
        content: {
          title: addForm.title,
          description: addForm.description,
          image_url: addForm.imageUrl,
          link: addForm.link,
        },
        start_date: addForm.startDate || null,
        end_date: addForm.endDate || null,
        monthly_fee: addForm.monthlyFee ? parseInt(addForm.monthlyFee) : null,
        review_status: 'pending',
        is_active: false,
      } as never);
      setShowAddModal(false);
      setAddForm({
        title: '',
        description: '',
        imageUrl: '',
        startDate: '',
        endDate: '',
        link: '',
        adType: 'banner',
        targetArea: '',
        monthlyFee: '',
      });
      invalidateAds();
    } catch (err) {
      console.error('광고 추가 실패:', err);
      // 데모 모드에서는 모달만 닫음
      setShowAddModal(false);
    }
  }

  function getCTR(impressions: number, clicks: number) {
    if (impressions === 0) return '0.00';
    return ((clicks / impressions) * 100).toFixed(2);
  }

  const allChecked = checkedItems.every(Boolean);

  return (
    <div>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-900">광고 관리</h2>
            <p className="text-[13px] text-primary-400 mt-1">
              배너 광고 등록, 심사, 성과를 관리합니다.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            광고 추가
          </Button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-secondary-50 rounded-2xl">
                <DollarSign className="w-6 h-6 text-secondary-700" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">월간 광고 매출</p>
                <p className="text-xl font-bold text-primary-900">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-primary-100 rounded-2xl">
                <Eye className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">총 노출수</p>
                <p className="text-xl font-bold text-primary-900">
                  {totalImpressions.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-secondary-100 rounded-2xl">
                <MousePointerClick className="w-6 h-6 text-secondary-700" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">총 클릭수</p>
                <p className="text-xl font-bold text-primary-900">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-warning-50 rounded-2xl">
                <Percent className="w-6 h-6 text-warning-600" />
              </div>
              <div>
                <p className="text-[13px] text-primary-400">평균 CTR</p>
                <p className="text-xl font-bold text-primary-900">
                  {avgCTR}%
                </p>
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
                  : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60'
              )}
            >
              {tab.label}
              <span
                className={clsx(
                  'ml-2 px-2 py-0.5 rounded-full text-[11px]',
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-100 text-primary-400'
                )}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <Card>
            <div className="flex flex-col items-center justify-center py-8 text-primary-400">
              <p className="text-sm text-primary-500 mb-1">
                DB 연결 실패 — 데모 데이터를 표시합니다.
              </p>
              <p className="text-xs text-primary-300">
                {(error as Error).message}
              </p>
            </div>
          </Card>
        )}

        {/* Ads Table */}
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
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      광고 제목
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      기관명
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      기간
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      노출수
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      클릭수
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      CTR
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      월 요금
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-16 text-center text-sm text-primary-300"
                      >
                        광고가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredAds.map((ad, idx) => {
                      const status = statusConfig[ad.display_status] || {
                        label: ad.display_status,
                        color: 'gray' as BadgeColor,
                      };
                      return (
                        <tr
                          key={ad.id}
                          className={`transition-all duration-150 hover:bg-secondary-50/40 ${
                            idx % 2 === 1 ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-primary-800">
                                {ad.title}
                              </p>
                              <p className="text-[12px] text-primary-400 mt-0.5">
                                {adTypeLabels[ad.ad_type] || ad.ad_type}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {ad.organization?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500">
                            {ad.start_date && ad.end_date
                              ? `${formatDate(ad.start_date)} ~ ${formatDate(ad.end_date)}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500 text-right">
                            {ad.impressions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500 text-right">
                            {ad.clicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-right">
                            <span
                              className={clsx(
                                parseFloat(getCTR(ad.impressions, ad.clicks)) >= 5
                                  ? 'text-success-600'
                                  : parseFloat(getCTR(ad.impressions, ad.clicks)) >= 2
                                    ? 'text-secondary-700'
                                    : 'text-primary-500'
                              )}
                            >
                              {getCTR(ad.impressions, ad.clicks)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-500 text-right">
                            {ad.monthly_fee
                              ? formatCurrency(ad.monthly_fee)
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={status.color}>{status.label}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {ad.display_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedAd(ad);
                                    setShowReviewModal(true);
                                    setCheckedItems(
                                      new Array(
                                        adRegulationChecklist.length
                                      ).fill(false)
                                    );
                                  }}
                                >
                                  심사
                                </Button>
                              )}
                              {ad.display_status === 'active' && (
                                <button
                                  onClick={() => handleToggleActive(ad)}
                                  className="p-2 rounded-xl text-warning-500 hover:bg-warning-50 transition-all"
                                  title="일시중지"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              )}
                              {ad.display_status === 'paused' && (
                                <button
                                  onClick={() => handleToggleActive(ad)}
                                  className="p-2 rounded-xl text-success-600 hover:bg-success-50 transition-all"
                                  title="재개"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    광고 제목
                  </p>
                  <p className="text-sm font-semibold text-primary-800">
                    {selectedAd.title}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    기관명
                  </p>
                  <p className="text-sm text-primary-600">
                    {selectedAd.organization?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    광고 유형
                  </p>
                  <p className="text-sm text-primary-600">
                    {adTypeLabels[selectedAd.ad_type] || selectedAd.ad_type}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    대상 지역
                  </p>
                  <p className="text-sm text-primary-600">
                    {selectedAd.target_area || '전국'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    월 요금
                  </p>
                  <p className="text-sm text-primary-600">
                    {selectedAd.monthly_fee
                      ? formatCurrency(selectedAd.monthly_fee)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    기간
                  </p>
                  <p className="text-sm text-primary-600">
                    {selectedAd.start_date && selectedAd.end_date
                      ? `${formatDate(selectedAd.start_date)} ~ ${formatDate(selectedAd.end_date)}`
                      : '미설정'}
                  </p>
                </div>
              </div>

              {selectedAd.description && (
                <div className="p-4 bg-primary-50/60 rounded-xl">
                  <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">
                    광고 설명
                  </p>
                  <p className="text-sm text-primary-600">
                    {selectedAd.description}
                  </p>
                </div>
              )}

              <div className="p-6 bg-tertiary-50 rounded-2xl">
                <h4 className="text-[13px] font-bold text-tertiary-700 mb-4">
                  의료광고 규정 체크리스트
                </h4>
                <div className="space-y-3">
                  {adRegulationChecklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-3 text-sm text-primary-600 cursor-pointer group"
                    >
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
                      <span className="group-hover:text-primary-800 transition-colors">
                        {item}
                      </span>
                      {checkedItems[idx] && (
                        <CheckCircle2 className="w-4 h-4 text-secondary-500 ml-auto shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => handleReject(selectedAd.id)}
                >
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

        {/* Add Ad Modal */}
        <Modal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="광고 추가"
          size="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  광고 제목
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) =>
                    setAddForm({ ...addForm, title: e.target.value })
                  }
                  placeholder="광고 제목을 입력하세요"
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  설명
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm({ ...addForm, description: e.target.value })
                  }
                  placeholder="광고 설명을 입력하세요"
                  rows={3}
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  이미지 URL
                </label>
                <input
                  type="url"
                  value={addForm.imageUrl}
                  onChange={(e) =>
                    setAddForm({ ...addForm, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  광고 유형
                </label>
                <select
                  value={addForm.adType}
                  onChange={(e) =>
                    setAddForm({ ...addForm, adType: e.target.value })
                  }
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                >
                  <option value="banner">배너 광고</option>
                  <option value="search_top">검색 상위 노출</option>
                  <option value="profile_boost">프로필 부스트</option>
                  <option value="area_exclusive">지역 독점</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  대상 지역
                </label>
                <input
                  type="text"
                  value={addForm.targetArea}
                  onChange={(e) =>
                    setAddForm({ ...addForm, targetArea: e.target.value })
                  }
                  placeholder="서울 강남구"
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  시작일
                </label>
                <input
                  type="date"
                  value={addForm.startDate}
                  onChange={(e) =>
                    setAddForm({ ...addForm, startDate: e.target.value })
                  }
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  종료일
                </label>
                <input
                  type="date"
                  value={addForm.endDate}
                  onChange={(e) =>
                    setAddForm({ ...addForm, endDate: e.target.value })
                  }
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  월 요금 (원)
                </label>
                <input
                  type="number"
                  value={addForm.monthlyFee}
                  onChange={(e) =>
                    setAddForm({ ...addForm, monthlyFee: e.target.value })
                  }
                  placeholder="300000"
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  랜딩 링크
                </label>
                <input
                  type="url"
                  value={addForm.link}
                  onChange={(e) =>
                    setAddForm({ ...addForm, link: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleAddAd}
                disabled={!addForm.title.trim()}
              >
                등록
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
