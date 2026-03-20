'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { StatCard } from '@/components/ui/StatCard';
import { TodayVisitSummary } from '@/components/hospital/dashboard/TodayVisitSummary';
import { RedFlagPanel } from '@/components/hospital/dashboard/RedFlagPanel';
import { WeekSchedulePreview } from '@/components/hospital/dashboard/WeekSchedulePreview';
import { RecentRequests } from '@/components/hospital/dashboard/RecentRequests';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAppStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 7) + '-01';

      // Today's visits
      const { count: todayTotal } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', today);

      const { count: todayCompleted } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', today)
        .eq('status', 'completed');

      // In progress
      const { count: inProgress } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', today)
        .in('status', ['en_route', 'checked_in', 'in_progress']);

      // Pending (scheduled for today)
      const { count: pending } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', today)
        .eq('status', 'scheduled');

      // Unhandled
      const { count: unhandled } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent_to_org');

      return {
        pending: pending || 0,
        inProgress: inProgress || 0,
        completed: todayCompleted || 0,
        unhandled: unhandled || 0,
      };
    },
  });

  const displayName = profile?.full_name || '관리자';

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          안녕하세요, {displayName}님. 오늘의 주요 현황입니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="전체 대기"
          value={stats?.pending ?? 0}
          trend={{ value: 5, label: '전주 대비' }}
          iconBg="bg-secondary/10 text-secondary"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="진행중"
          value={stats?.inProgress ?? 0}
          trend={{ value: 2, label: '전주 대비' }}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="완료 실적"
          value={stats?.completed ?? 0}
          trend={{ value: 12, label: '전주 대비' }}
          iconBg="bg-secondary/10 text-secondary"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="미처리 건"
          value={stats?.unhandled ?? 0}
          trend={{ value: -3, label: '전주 대비' }}
          iconBg="bg-tertiary/10 text-tertiary"
        />
      </div>

      {/* Red Flag Alert Banner */}
      <RedFlagPanel />

      {/* Two-column: Requests + Today Schedule */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <RecentRequests />
        <TodayVisitSummary />
      </div>

      {/* Week Schedule */}
      <WeekSchedulePreview />
    </div>
  );
}
