'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Heart,
  BarChart3,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '@/components/admin/ui/StatCard';
import Card from '@/components/admin/ui/Card';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency } from '@homecare/shared-utils';
import type { DashboardStats, DailyChartData } from '@homecare/shared-types';

const tooltipStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 12px 40px -8px rgba(0, 32, 69, 0.12)',
  padding: '12px 16px',
};

function getDateRange30Days() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createBrowserSupabaseClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  const [
    { count: orgCount },
    { count: orgCountLastMonth },
    { count: patientCount },
    { count: patientCountLastMonth },
    { data: subscriptions },
    { data: subscriptionsLastMonth },
    { count: staffCount },
    { count: staffCountLastMonth },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified').lte('created_at', lastMonthEnd),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('created_at', lastMonthEnd),
    supabase.from('subscriptions').select('amount, plan').eq('status', 'active'),
    supabase.from('subscriptions').select('amount, plan').eq('status', 'active').lte('created_at', lastMonthEnd),
    supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true).lte('created_at', lastMonthEnd),
  ]);

  const mrr = (subscriptions as { amount: number; plan: string }[] | null)?.reduce((sum: number, sub: { amount: number }) => sum + (sub.amount || 0), 0) ?? 0;
  const mrrLastMonth = (subscriptionsLastMonth as { amount: number; plan: string }[] | null)?.reduce((sum: number, sub: { amount: number }) => sum + (sub.amount || 0), 0) ?? 0;

  // 무료→유료 전환율 계산
  const allSubs = (subscriptions as { amount: number; plan: string }[] | null) ?? [];
  const paidOrgCount = allSubs.filter((s) => s.plan !== 'free').length;
  const totalSubCount = allSubs.length;
  const paidConversionRate = totalSubCount > 0 ? Math.round((paidOrgCount / totalSubCount) * 1000) / 10 : 0;

  function calcGrowth(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '신규' : '-';
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return `+${pct}% 전월 대비`;
    if (pct < 0) return `${pct}% 전월 대비`;
    return '변동 없음';
  }

  return {
    totalOrgs: orgCount ?? 0,
    totalPatients: patientCount ?? 0,
    mrr,
    totalStaff: staffCount ?? 0,
    orgGrowth: calcGrowth(orgCount ?? 0, orgCountLastMonth ?? 0),
    patientGrowth: calcGrowth(patientCount ?? 0, patientCountLastMonth ?? 0),
    mrrGrowth: calcGrowth(mrr, mrrLastMonth),
    staffGrowth: calcGrowth(staffCount ?? 0, staffCountLastMonth ?? 0),
    paidConversionRate,
    paidOrgCount,
  };
}

async function fetchChartData(): Promise<DailyChartData[]> {
  const supabase = createBrowserSupabaseClient();
  const { start, end } = getDateRange30Days();

  const [{ data: serviceRequests }, { data: visits }] = await Promise.all([
    supabase
      .from('service_requests')
      .select('created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('visits')
      .select('scheduled_date')
      .gte('scheduled_date', start.toISOString().split('T')[0])
      .lte('scheduled_date', end.toISOString().split('T')[0]),
  ]);

  const matchMap = new Map<string, number>();
  const visitMap = new Map<string, number>();

  ((serviceRequests || []) as { created_at: string }[]).forEach((sr) => {
    const d = new Date(sr.created_at);
    const key = d.toISOString().split('T')[0];
    matchMap.set(key, (matchMap.get(key) || 0) + 1);
  });

  ((visits || []) as { scheduled_date: string }[]).forEach((v) => {
    const key = v.scheduled_date;
    visitMap.set(key, (visitMap.get(key) || 0) + 1);
  });

  const dailyData: DailyChartData[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

    dailyData.push({
      date: dateStr,
      matchings: matchMap.get(key) || 0,
      visits: visitMap.get(key) || 0,
    });
  }

  return dailyData;
}

export default function KPIDashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
  } = useQuery({
    queryKey: ['admin-dashboard-chart'],
    queryFn: fetchChartData,
  });

  const isLoading = statsLoading || chartLoading;
  const error = statsError || chartError;

  if (error) {
    return (
      <div>
        <div className="p-8">
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-primary-400">
              <p className="text-sm font-semibold text-danger-600 mb-2">대시보드 데이터를 불러오지 못했습니다.</p>
              <p className="text-xs text-primary-300">{(error as Error).message}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-7 animate-pulse">
                <div className="h-3 bg-primary-100 rounded-full w-20 mb-4" />
                <div className="h-8 bg-primary-100 rounded-xl w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const safeStats = stats ?? {
    totalOrgs: 0, totalPatients: 0, mrr: 0, totalStaff: 0,
    orgGrowth: '-', patientGrowth: '-', mrrGrowth: '-', staffGrowth: '-',
    paidConversionRate: 0, paidOrgCount: 0,
  };
  const safeChartData = chartData ?? [];

  return (
    <div>
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="전체 기관"
            value={`${safeStats.totalOrgs.toLocaleString()}개`}
            change={safeStats.orgGrowth}
            changeType={safeStats.orgGrowth.startsWith('+') ? 'positive' : safeStats.orgGrowth.startsWith('-') ? 'negative' : 'neutral'}
            icon={Building2}
            iconColor="bg-secondary-50 text-secondary-700"
          />
          <StatCard
            title="유료 전환율"
            value={`${safeStats.paidConversionRate}%`}
            change={`유료 ${safeStats.paidOrgCount}개 / 전체 ${safeStats.totalOrgs}개`}
            changeType={safeStats.paidConversionRate > 30 ? 'positive' : 'neutral'}
            icon={TrendingUp}
            iconColor="bg-success-50 text-success-600"
          />
          <StatCard
            title="MRR"
            value={formatCurrency(safeStats.mrr)}
            change={safeStats.mrrGrowth}
            changeType={safeStats.mrrGrowth.startsWith('+') ? 'positive' : safeStats.mrrGrowth.startsWith('-') ? 'negative' : 'neutral'}
            icon={BarChart3}
            iconColor="bg-primary-100 text-primary-800"
          />
          <StatCard
            title="총 환자 수"
            value={`${safeStats.totalPatients.toLocaleString()}명`}
            change={safeStats.patientGrowth}
            changeType={safeStats.patientGrowth.startsWith('+') ? 'positive' : safeStats.patientGrowth.startsWith('-') ? 'negative' : 'neutral'}
            icon={Heart}
            iconColor="bg-secondary-50 text-secondary-700"
          />
          <StatCard
            title="의료진 수"
            value={`${safeStats.totalStaff.toLocaleString()}명`}
            change={safeStats.staffGrowth}
            changeType={safeStats.staffGrowth.startsWith('+') ? 'positive' : safeStats.staffGrowth.startsWith('-') ? 'negative' : 'neutral'}
            icon={Stethoscope}
            iconColor="bg-secondary-100 text-secondary-700"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">일별 매칭 건수</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="matchings" name="매칭 건수" stroke="#006A63" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#006A63', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">일별 방문 건수</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="visits" name="방문 건수" fill="#002045" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-[15px] font-bold text-primary-900 mb-6">DAU / MAU 추이</h3>
          <div className="flex flex-col items-center justify-center h-80 text-primary-300">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-primary-200" />
            </div>
            <p className="text-sm font-semibold text-primary-400 mb-1">추후 구현 예정</p>
            <p className="text-[12px] text-primary-300">사용자 활동 추적 기능이 활성화되면 DAU/MAU 데이터가 표시됩니다.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
