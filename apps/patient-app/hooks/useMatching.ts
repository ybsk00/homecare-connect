import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import {
  createMatchingRequest,
  getMatchingResults,
  selectOrganization,
  getServiceRequests,
} from '@homecare/supabase-client';
import { getOrganization } from '@homecare/supabase-client';
import type { TablesInsert } from '@homecare/shared-types';

export function useServiceRequests() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['service-requests', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      return getServiceRequests(supabase, user.id);
    },
    enabled: !!user,
  });
}

export function useMatchingResults(patientId: string | null, radiusKm = 10) {
  return useQuery({
    queryKey: ['matching-results', patientId, radiusKm],
    queryFn: async () => {
      if (!patientId) throw new Error('환자 ID가 필요합니다');
      return getMatchingResults(supabase, patientId, radiusKm);
    },
    enabled: !!patientId,
  });
}

export function useOrganizationDetail(orgId: string | null) {
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('기관 ID가 필요합니다');
      return getOrganization(supabase, orgId);
    },
    enabled: !!orgId,
  });
}

export function useCreateMatchingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: TablesInsert<'service_requests'>) => {
      return createMatchingRequest(supabase, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useSelectOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      orgId,
    }: {
      requestId: string;
      orgId: string;
    }) => {
      return selectOrganization(supabase, requestId, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}
