import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Tables } from '@homecare/shared-types';

type RedFlagAlert = Tables<'red_flag_alerts'>;

export function useRedFlags() {
  const staffInfo = useAuthStore((s) => s.staffInfo);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['redFlags', staffInfo?.orgId],
    queryFn: async () => {
      if (!staffInfo?.orgId) return [];

      const { data, error } = await supabase
        .from('red_flag_alerts')
        .select(
          `
          *,
          patient:patients (
            id,
            full_name,
            care_grade
          )
        `,
        )
        .eq('org_id', staffInfo.orgId)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
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
    await supabase
      .from('red_flag_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    queryClient.invalidateQueries({
      queryKey: ['redFlags', staffInfo?.orgId],
    });
  };

  const resolveAlert = async (alertId: string, note: string) => {
    await supabase
      .from('red_flag_alerts')
      .update({
        status: 'resolved',
        resolution_note: note,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

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
