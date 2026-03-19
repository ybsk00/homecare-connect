import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getServicePlanCareItems } from '@homecare/supabase-client';

export function useNurseServicePlans() {
  const staffInfo = useAuthStore((s) => s.staffInfo);

  const query = useQuery({
    queryKey: ['nurseServicePlans', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];

      try {
        const { data, error } = await supabase
          .from('service_plans')
          .select(
            `
            id,
            status,
            visit_frequency,
            visit_day_of_week,
            start_date,
            end_date,
            goals,
            precautions,
            created_at,
            patient:patients (
              id,
              full_name,
              birth_date,
              gender,
              care_grade,
              primary_diagnosis
            )
          `,
          )
          .eq('nurse_id', staffInfo.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data ?? [];
      } catch (error) {
        console.error('서비스 계획 목록 조회 실패:', error);
        throw error;
      }
    },
    enabled: !!staffInfo?.id,
    staleTime: 1000 * 60,
  });

  const plans = query.data ?? [];
  const activePlans = plans.filter(
    (p) => (p as { status: string }).status === 'active',
  );
  const completedPlans = plans.filter(
    (p) => (p as { status: string }).status === 'terminated',
  );

  return {
    plans,
    activePlans,
    completedPlans,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useServicePlanDetail(planId: string | undefined) {
  const query = useQuery({
    queryKey: ['servicePlanDetail', planId],
    queryFn: async () => {
      if (!planId) return null;

      try {
        const { data: planData, error: planError } = await supabase
          .from('service_plans')
          .select(
            `
            id,
            status,
            visit_frequency,
            visit_day_of_week,
            start_date,
            end_date,
            goals,
            precautions,
            created_at,
            patient:patients (
              id,
              full_name,
              birth_date,
              gender,
              care_grade,
              mobility,
              primary_diagnosis,
              address
            )
          `,
          )
          .eq('id', planId)
          .single();

        if (planError) throw planError;

        const careItemsData = await getServicePlanCareItems(supabase, planId);

        return {
          ...planData,
          care_items: careItemsData?.care_items ?? [],
        } as unknown as {
          id: string;
          status: string;
          visit_frequency: string;
          visit_day_of_week: number[];
          start_date: string | null;
          end_date: string | null;
          goals: string | null;
          precautions: string | null;
          care_items: unknown;
          patient: { id: string; full_name: string; birth_date: string; gender: string; care_grade: string | null; mobility: string | null; primary_diagnosis: string | null; address: string } | null;
        };
      } catch (error) {
        console.error('서비스 계획 상세 조회 실패:', error);
        throw error;
      }
    },
    enabled: !!planId,
  });

  return {
    plan: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
