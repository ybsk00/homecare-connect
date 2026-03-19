import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getAIReportsByPatient, getAIReport } from '@homecare/supabase-client';

export function useAIReportsByPatient(patientId: string | null) {
  return useQuery({
    queryKey: ['ai-reports', 'by-patient', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('환자 ID가 필요합니다');
      return getAIReportsByPatient(supabase, patientId);
    },
    enabled: !!patientId,
  });
}

export function useAIReportDetail(reportId: string | null) {
  return useQuery({
    queryKey: ['ai-reports', 'detail', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('리포트 ID가 필요합니다');
      return getAIReport(supabase, reportId);
    },
    enabled: !!reportId,
  });
}
