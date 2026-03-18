import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { usePatientStore } from '@/stores/patient-store';
import {
  getPatientsByGuardian,
  getPatient,
  createPatient,
  updatePatient,
} from '@homecare/supabase-client';
import type { TablesInsert, TablesUpdate } from '@homecare/shared-types';
import { useEffect } from 'react';

export function usePatientsList() {
  const user = useAuthStore((s) => s.user);
  const setPatients = usePatientStore((s) => s.setPatients);

  const query = useQuery({
    queryKey: ['patients', 'list', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      return getPatientsByGuardian(supabase, user.id);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (query.data) {
      const patients = query.data
        .map((link) => link.patient)
        .filter((p): p is NonNullable<typeof p> => p !== null);
      setPatients(patients as any[]);
    }
  }, [query.data, setPatients]);

  return query;
}

export function usePatientDetail(patientId: string | null) {
  return useQuery({
    queryKey: ['patients', 'detail', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('환자 ID가 필요합니다');
      return getPatient(supabase, patientId);
    },
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      patient,
      relationship,
    }: {
      patient: TablesInsert<'patients'>;
      relationship: string;
    }) => {
      if (!user) throw new Error('로그인이 필요합니다');
      return createPatient(supabase, patient, user.id, relationship);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      updates,
    }: {
      patientId: string;
      updates: TablesUpdate<'patients'>;
    }) => {
      return updatePatient(supabase, patientId, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.setQueryData(['patients', 'detail', data.id], data);
    },
  });
}
