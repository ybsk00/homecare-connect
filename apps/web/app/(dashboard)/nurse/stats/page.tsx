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
  TrendingUp,
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
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">월간 통계</h1>
        <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
          방문 실적 및 활동 통계를 확인합니다.
        </p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => navigateMonth('prev')}
          className="rounded-2xl p-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-xl font-extrabold tracking-tight text-on-surface">{monthLabel}</span>
        <button
          onClick={() => navigateMonth('next')}
          className="rounded-2xl p-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats cards - large display numbers */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-surface-container-lowest p-7 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight text-on-surface">{monthData?.totalVisits ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">총 방문</p>
          {monthData && monthData.totalVisits > 0 && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-surface-container-lowest p-7 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight text-on-surface">{monthData?.completedVisits ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">완료</p>
          {monthData && monthData.totalVisits > 0 && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${monthData.completionRate}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-secondary">{monthData.completionRate}%</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-surface-container-lowest p-7 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tertiary/10">
            <Clock className="h-5 w-5 text-tertiary" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight text-on-surface">{monthData?.totalHours ?? 0}<span className="ml-1 text-lg font-bold text-on-surface-variant">시간</span></p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">총 시간</p>
        </div>

        <div className="rounded-3xl bg-surface-container-lowest p-7 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Timer className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight text-on-surface">{monthData?.avgDuration ?? 0}<span className="ml-1 text-lg font-bold text-on-surface-variant">분</span></p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">평균 소요시간</p>
        </div>
      </div>

      {/* Daily visit count chart */}
      <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-extrabold tracking-tight text-on-surface">일별 방문 건수</h2>
        </div>
        {(!monthData || monthData.dailyData.every((d) => d.total === 0)) ? (
          <div className="py-16 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-on-surface-variant/15" />
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              해당 월 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData?.dailyData ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/20" vertical={false} />
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
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} iconType="circle" iconSize={8} />
                <Bar dataKey="total" name="전체" fill="var(--color-surface-container-high)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" name="완료" fill="var(--color-secondary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Completion rate trend */}
      <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold tracking-tight text-on-surface">주별 완료율 추이</h2>
        </div>
        {(!monthData || monthData.weeklyRate.length === 0) ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-on-surface-variant/15" />
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData?.weeklyRate ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/20" vertical={false} />
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
                  strokeWidth={3}
                  dot={{ r: 5, fill: 'var(--color-primary)', strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: 'var(--color-primary)', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
