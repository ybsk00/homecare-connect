import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import {
  getRedFlagAlerts,
  acknowledgeRedFlagAlert,
  resolveRedFlagAlert,
} from '@homecare/supabase-client';
import type { Tables } from '@homecare/shared-types';

type RedFlagAlert = Tables<'red_flag_alerts'>;

export function useRedFlags() {
  const staffInfo = useAuthStore((s) => s.staffInfo);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['redFlags', staffInfo?.orgId],
    queryFn: async () => {
      if (!staffInfo?.orgId) return [];

      return await getRedFlagAlerts(supabase, staffInfo.orgId);
    },
    enabled: !!staffInfo?.orgId,
    staleTime: 1000 * 30,
  });

  // 실시간 구독
  useEffect(() => {
    if (!staffInfo?.orgId) return;

    const channel = supabase
      .channel('red-flags')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'red_flag_alerts',
          filter: `org_id=eq.${staffInfo.orgId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['redFlags', staffInfo.orgId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffInfo?.orgId, queryClient]);

  const activeAlerts = (query.data ?? []).filter(
    (a: { status: string }) => a.status === 'active',
  );
  const acknowledgedAlerts = (query.data ?? []).filter(
    (a: { status: string }) => a.status === 'acknowledged',
  );

  const acknowledgeAlert = async (alertId: string) => {
    const userId = useAuthStore.getState().session?.user?.id;
    await acknowledgeRedFlagAlert(supabase, alertId, userId!);

    queryClient.invalidateQueries({
      queryKey: ['redFlags', staffInfo?.orgId],
    });
  };

  const resolveAlert = async (alertId: string, note: string) => {
    await resolveRedFlagAlert(supabase, alertId, note);

    queryClient.invalidateQueries({
      queryKey: ['redFlags', staffInfo?.orgId],
    });
  };

  return {
    alerts: query.data ?? [],
    activeAlerts,
    acknowledgedAlerts,
    activeCount: activeAlerts.length,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    acknowledgeAlert,
    resolveAlert,
  };
}
