import { create } from 'zustand';
import type { Tables } from '@homecare/shared-types';

type Patient = Tables<'patients'>;

interface PatientState {
  selectedPatientId: string | null;
  patients: Patient[];

  setSelectedPatientId: (id: string | null) => void;
  setPatients: (patients: Patient[]) => void;
  getSelectedPatient: () => Patient | null;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  selectedPatientId: null,
  patients: [],

  setSelectedPatientId: (id) => set({ selectedPatientId: id }),

  setPatients: (patients) => {
    set({ patients });
    // 선택된 환자가 없으면 첫 번째 환자 자동 선택
    const { selectedPatientId } = get();
    if (!selectedPatientId && patients.length > 0) {
      set({ selectedPatientId: patients[0].id });
    }
  },

  getSelectedPatient: () => {
    const { selectedPatientId, patients } = get();
    if (!selectedPatientId) return null;
    return patients.find((p) => p.id === selectedPatientId) ?? null;
  },
}));
