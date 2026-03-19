import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  getServicePlansByPatient,
  getServicePlan,
  consentServicePlan,
} from '@homecare/supabase-client';

export function useServicePlansByPatient(patientId: string | null) {
  return useQuery({
    queryKey: ['service-plans', 'by-patient', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('환자 ID가 필요합니다');
      return getServicePlansByPatient(supabase, patientId);
    },
    enabled: !!patientId,
  });
}

export function useServicePlanDetail(planId: string | null) {
  return useQuery({
    queryKey: ['service-plans', 'detail', planId],
    queryFn: async () => {
      if (!planId) throw new Error('서비스 계획 ID가 필요합니다');
      return getServicePlan(supabase, planId);
    },
    enabled: !!planId,
  });
}

export function useConsentServicePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      signatureUrl,
    }: {
      planId: string;
      signatureUrl?: string;
    }) => {
      return consentServicePlan(supabase, planId, signatureUrl);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
      queryClient.setQueryData(['service-plans', 'detail', data.id], data);
    },
  });
}
