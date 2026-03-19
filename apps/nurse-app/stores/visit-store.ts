import { create } from 'zustand';
import type { VisitWithPatient, VisitFormData } from '@homecare/shared-types';

export type { VisitWithPatient, VisitFormData };

interface VisitState {
  todayVisits: VisitWithPatient[];
  currentVisitId: string | null;
  formData: Record<string, VisitFormData>;

  setTodayVisits: (visits: VisitWithPatient[]) => void;
  setCurrentVisitId: (id: string | null) => void;
  initFormData: (
    visitId: string,
    careItems?: { item: string; done: boolean; note?: string }[],
  ) => void;
  updateFormData: (visitId: string, partial: Partial<VisitFormData>) => void;
  getFormData: (visitId: string) => VisitFormData;
  clearFormData: (visitId: string) => void;
}

const defaultFormData: VisitFormData = {
  vitals: {},
  performedItems: [],
  generalCondition: undefined,
  consciousness: undefined,
  skinCondition: undefined,
  nutritionIntake: undefined,
  painScore: undefined,
  nurseNote: '',
  messageToGuardian: '',
  photos: [],
  voiceMemoUri: undefined,
};

export const useVisitStore = create<VisitState>((set, get) => ({
  todayVisits: [],
  currentVisitId: null,
  formData: {},

  setTodayVisits: (visits) => set({ todayVisits: visits }),
  setCurrentVisitId: (id) => set({ currentVisitId: id }),

  initFormData: (visitId, careItems) => {
    const existing = get().formData[visitId];
    if (!existing) {
      set((state) => ({
        formData: {
          ...state.formData,
          [visitId]: {
            ...defaultFormData,
            performedItems: careItems ?? [],
          },
        },
      }));
    }
  },

  updateFormData: (visitId, partial) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [visitId]: {
          ...(state.formData[visitId] ?? defaultFormData),
          ...partial,
        },
      },
    }));
  },

  getFormData: (visitId) => {
    return get().formData[visitId] ?? { ...defaultFormData };
  },

  clearFormData: (visitId) => {
    set((state) => {
      const next = { ...state.formData };
      delete next[visitId];
      return { formData: next };
    });
  },
}));
