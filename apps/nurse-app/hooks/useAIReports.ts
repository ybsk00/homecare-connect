import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getAIReportsByOrg, getAIReport } from '@homecare/supabase-client';

export function useNurseAIReports() {
  const staffInfo = useAuthStore((s) => s.staffInfo);

  const query = useQuery({
    queryKey: ['nurseAIReports', staffInfo?.orgId],
    queryFn: async () => {
      if (!staffInfo?.orgId) return [];

      try {
        return await getAIReportsByOrg(supabase, staffInfo.orgId);
      } catch (error) {
        console.error('AI 리포트 목록 조회 실패:', error);
        throw error;
      }
    },
    enabled: !!staffInfo?.orgId,
    staleTime: 1000 * 60,
  });

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAIReportDetail(reportId: string | undefined) {
  const query = useQuery({
    queryKey: ['aiReportDetail', reportId],
    queryFn: async () => {
      if (!reportId) return null;

      try {
        return await getAIReport(supabase, reportId);
      } catch (error) {
        console.error('AI 리포트 상세 조회 실패:', error);
        throw error;
      }
    },
    enabled: !!reportId,
  });

  return {
    report: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
