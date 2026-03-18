import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getVisitsByPatient, getVisitDetail } from '@homecare/supabase-client';
import { usePatientStore } from '@/stores/patient-store';

export function useVisitsByPatient(patientId: string | null, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['visits', 'by-patient', patientId, limit, offset],
    queryFn: async () => {
      if (!patientId) throw new Error('환자 ID가 필요합니다');
      return getVisitsByPatient(supabase, patientId, limit, offset);
    },
    enabled: !!patientId,
  });
}

export function useVisitDetail(visitId: string | null) {
  return useQuery({
    queryKey: ['visits', 'detail', visitId],
    queryFn: async () => {
      if (!visitId) throw new Error('방문 ID가 필요합니다');
      return getVisitDetail(supabase, visitId);
    },
    enabled: !!visitId,
  });
}

export function useTodayVisits() {
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['visits', 'today', selectedPatientId, today],
    queryFn: async () => {
      if (!selectedPatientId) return { data: [], count: 0 };

      const { data, error } = await supabase
        .from('visits')
        .select(
          `
          *,
          nurse:staff (
            id,
            staff_type,
            user:profiles (
              full_name,
              avatar_url
            )
          )
        `,
        )
        .eq('patient_id', selectedPatientId)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      return { data: data ?? [], count: data?.length ?? 0 };
    },
    enabled: !!selectedPatientId,
  });
}

export function useUpcomingVisits(patientId: string | null, limit = 5) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['visits', 'upcoming', patientId, today],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('visits')
        .select(
          `
          *,
          nurse:staff (
            id,
            staff_type,
            user:profiles (
              full_name,
              avatar_url
            )
          )
        `,
        )
        .eq('patient_id', patientId)
        .gte('scheduled_date', today)
        .in('status', ['scheduled', 'en_route', 'checked_in', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });
}
