import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useVisitStore, type VisitWithPatient } from '@/stores/visit-store';
import { getToday } from '@homecare/shared-utils';
import { getVisitsByNurseDate } from '@homecare/supabase-client';

export function useTodayVisits() {
  const staffInfo = useAuthStore((s) => s.staffInfo);
  const setTodayVisits = useVisitStore((s) => s.setTodayVisits);
  const todayVisits = useVisitStore((s) => s.todayVisits);
  const queryClient = useQueryClient();

  const today = getToday();

  const query = useQuery({
    queryKey: ['todayVisits', staffInfo?.id, today],
    queryFn: async () => {
      if (!staffInfo?.id) return [];

      const data = await getVisitsByNurseDate(supabase, staffInfo.id, today);
      return (data ?? []) as unknown as VisitWithPatient[];
    },
    enabled: !!staffInfo?.id,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5, // 5분마다 갱신
  });

  // 데이터가 변경되면 스토어에 업데이트
  useEffect(() => {
    if (query.data) {
      setTodayVisits(query.data);
    }
  }, [query.data, setTodayVisits]);

  // 실시간 구독
  useEffect(() => {
    if (!staffInfo?.id) return;

    const channel = supabase
      .channel('today-visits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
          filter: `nurse_id=eq.${staffInfo.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['todayVisits', staffInfo.id, today],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffInfo?.id, today, queryClient]);

  const completedCount = todayVisits.filter(
    (v) => v.status === 'completed' || v.status === 'checked_out',
  ).length;

  const totalEstimatedMin = todayVisits.reduce(
    (sum, v) => sum + (v.estimated_duration_min ?? 0),
    0,
  );

  return {
    visits: todayVisits,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    totalCount: todayVisits.length,
    completedCount,
    totalEstimatedMin,
  };
}
