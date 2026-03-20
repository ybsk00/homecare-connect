'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
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
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
export default function StatsPage() {
  const { staffInfo } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const selectedYear = parseInt(selectedMonth.split('-')[0]);
  const selectedMonthNum = parseInt(selectedMonth.split('-')[1]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const date = new Date(selectedYear, selectedMonthNum - 1);
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setSelectedMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // Monthly visit data
  const { data: monthData, isLoading } = useQuery({
    queryKey: ['nurse-monthly-stats', staffInfo?.id, selectedMonth],
    queryFn: async () => {
      if (!staffInfo?.id) return null;
      const supabase = createBrowserSupabaseClient();

      const monthStart = `${selectedMonth}-01`;
      const lastDay = new Date(selectedYear, selectedMonthNum, 0).getDate();
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data: visits } = await supabase
        .from('visits')
        .select('scheduled_date, status, checkin_at, checkout_at, estimated_duration_min, actual_duration_min')
        .eq('nurse_id', staffInfo.id)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);

      if (!visits) return null;

      // Aggregate stats
      let totalVisits = 0;
      let completedVisits = 0;
      let totalMinutes = 0;
      let totalActualMinutes = 0;

      const dailyMap = new Map<string, { total: number; completed: number }>();

      // Initialize all days
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        dailyMap.set(dateStr, { total: 0, completed: 0 });
      }

      visits.forEach((v: Record<string, unknown>) => {
        totalVisits++;
        const dateStr = v.scheduled_date as string;
        const entry = dailyMap.get(dateStr);
        if (entry) entry.total++;

        if (v.status === 'completed') {
          completedVisits++;
          if (entry) entry.completed++;
          totalMinutes += (v.estimated_duration_min as number) || 0;
          totalActualMinutes += (v.actual_duration_min as number) || 0;
        }
      });

      const avgDuration = completedVisits > 0 ? Math.round(totalActualMinutes / completedVisits) : 0;

      // Daily chart data
      const dailyData = Array.from(dailyMap.entries()).map(([date, val]) => ({
        day: parseInt(date.split('-')[2]) + '일',
        total: val.total,
        completed: val.completed,
      }));

      // Completion rate trend (weekly)
      const weeks: { week: string; rate: number }[] = [];
      for (let w = 0; w < Math.ceil(lastDay / 7); w++) {
        let wTotal = 0;
        let wCompleted = 0;
        for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, lastDay); d++) {
          const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
          const entry = dailyMap.get(dateStr);
          if (entry) {
            wTotal += entry.total;
            wCompleted += entry.completed;
          }
        }
        weeks.push({
          week: `${w + 1}주차`,
          rate: wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0,
        });
      }

      return {
        totalVisits,
        completedVisits,
        totalHours: Math.round(totalMinutes / 60),
        avgDuration,
        completionRate: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0,
        dailyData,
        weeklyRate: weeks,
      };
    },
    enabled: !!staffInfo?.id,
  });

  if (isLoading) return <Loading />;

  const monthLabel = `${selectedYear}년 ${selectedMonthNum}월`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">월간 통계</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          방문 실적 및 활동 통계를 확인합니다.
        </p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-on-surface">{monthLabel}</span>
        <button
          onClick={() => navigateMonth('next')}
          className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="총 방문"
          value={monthData?.totalVisits ?? 0}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="완료"
          value={monthData?.completedVisits ?? 0}
          iconBg="bg-secondary/10 text-secondary"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="총 시간"
          value={`${monthData?.totalHours ?? 0}시간`}
          iconBg="bg-tertiary/10 text-tertiary"
        />
        <StatCard
          icon={<Timer className="h-5 w-5" />}
          label="평균 소요시간"
          value={`${monthData?.avgDuration ?? 0}분`}
          iconBg="bg-primary/10 text-primary"
        />
      </div>

      {/* Daily visit count chart */}
      <Card className="bg-surface-container-lowest ambient-shadow">
        <CardHeader>
          <CardTitle>
            <BarChart3 className="mr-2 inline h-5 w-5 text-secondary" />
            일별 방문 건수
          </CardTitle>
        </CardHeader>
        {(!monthData || monthData.dailyData.every((d) => d.total === 0)) ? (
          <div className="py-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">
              해당 월 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData?.dailyData ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  className="fill-on-surface-variant"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-on-surface-variant"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                    fontSize: 12,
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-container-lowest)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Bar dataKey="total" name="전체" fill="var(--color-surface-container-high)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="완료" fill="var(--color-secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Completion rate trend */}
      <Card className="bg-surface-container-lowest ambient-shadow">
        <CardHeader>
          <CardTitle>
            <CheckCircle2 className="mr-2 inline h-5 w-5 text-primary" />
            주별 완료율 추이
          </CardTitle>
        </CardHeader>
        {(!monthData || monthData.weeklyRate.length === 0) ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">
              데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData?.weeklyRate ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  className="fill-on-surface-variant"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-on-surface-variant"
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                    fontSize: 12,
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-container-lowest)',
                  }}
                  formatter={(value: number) => [`${value}%`, '완료율']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="완료율"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--color-primary)', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
