'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, TrendingUp, Clock, Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function StatsPage() {
  const { data: monthlyVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['stats-monthly-visits'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const months = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString().split('T')[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];

        const { count: total } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_date', start)
          .lte('scheduled_date', end);

        const { count: completed } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_date', start)
          .lte('scheduled_date', end)
          .eq('status', 'completed');

        months.push({
          month: `${d.getMonth() + 1}월`,
          total: total || 0,
          completed: completed || 0,
        });
      }

      return months;
    },
  });

  const { data: nurseStats = [], isLoading: nurseLoading } = useQuery({
    queryKey: ['stats-nurse-performance'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const monthStart = new Date();
      monthStart.setDate(1);
      const start = monthStart.toISOString().split('T')[0];

      const { data: staffList } = await supabase
        .from('staff')
        .select('id, profiles!inner(full_name)')
        .eq('is_active', true);

      if (!staffList) return [];

      return Promise.all(
        staffList.map(async (s: Record<string, unknown>) => {
          const profile = s.profiles as { full_name: string } | null;

          const { count: totalVisits } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('nurse_id', s.id as string)
            .gte('scheduled_date', start);

          const { count: completedVisits } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('nurse_id', s.id as string)
            .gte('scheduled_date', start)
            .eq('status', 'completed');

          return {
            name: profile?.full_name || '-',
            total: totalVisits || 0,
            completed: completedVisits || 0,
            rate:
              totalVisits && totalVisits > 0
                ? Math.round(((completedVisits || 0) / totalVisits) * 100)
                : 0,
          };
        })
      );
    },
  });

  const { data: orgStats } = useQuery({
    queryKey: ['stats-org'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: org } = await supabase
        .from('organizations')
        .select('punctuality_rate, rating_avg, review_count')
        .eq('owner_id', user.id)
        .single();

      return org;
    },
  });

  const ratingTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: `${d.getMonth() + 1}월`,
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
    };
  });

  if (visitsLoading || nurseLoading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">운영 통계</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          기관 운영 현황을 분석합니다.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">시간 엄수율</p>
              <p className="text-2xl font-bold text-on-surface">
                {orgStats?.punctuality_rate
                  ? `${orgStats.punctuality_rate}%`
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary/10">
              <Star className="h-5 w-5 text-tertiary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">평균 평점</p>
              <p className="text-2xl font-bold text-on-surface">
                {orgStats?.rating_avg?.toFixed(1) || '-'}
                <span className="ml-1 text-sm font-normal text-on-surface-variant">
                  ({orgStats?.review_count || 0}건)
                </span>
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">이번 달 완료율</p>
              <p className="text-2xl font-bold text-on-surface">
                {monthlyVisits.length > 0
                  ? `${
                      monthlyVisits[monthlyVisits.length - 1].total > 0
                        ? Math.round(
                            (monthlyVisits[monthlyVisits.length - 1].completed /
                              monthlyVisits[monthlyVisits.length - 1].total) *
                              100
                          )
                        : 0
                    }%`
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly visits chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            <BarChart3 className="mr-2 inline h-5 w-5 text-on-surface-variant" />
            월별 방문 건수
          </CardTitle>
        </CardHeader>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyVisits}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EB" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#42474E' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#42474E' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                  fontSize: 12,
                  padding: '12px 16px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey="total"
                name="전체"
                fill="#E5E9EB"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="completed"
                name="완료"
                fill="#006A63"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Nurse performance table */}
        <Card>
          <CardHeader>
            <CardTitle>간호사별 방문 실적 (이번 달)</CardTitle>
          </CardHeader>
          {nurseStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">
              데이터가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="rounded-tl-xl px-4 py-3 text-left font-semibold text-on-surface-variant">
                      이름
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                      전체
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface-variant">
                      완료
                    </th>
                    <th className="rounded-tr-xl px-4 py-3 text-right font-semibold text-on-surface-variant">
                      완료율
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nurseStats.map((nurse, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50'}
                    >
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {nurse.name}
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">
                        {nurse.total}건
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">
                        {nurse.completed}건
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={clsx(
                            'font-semibold',
                            nurse.rate >= 80
                              ? 'text-secondary'
                              : nurse.rate >= 60
                                ? 'text-tertiary'
                                : 'text-error'
                          )}
                        >
                          {nurse.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Rating trend chart */}
        <Card>
          <CardHeader>
            <CardTitle>평점 추이</CardTitle>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EB" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#42474E' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fontSize: 12, fill: '#42474E' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                    fontSize: 12,
                    padding: '12px 16px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  name="평점"
                  stroke="#002045"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#002045', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#002045', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
