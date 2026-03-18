import { create } from 'zustand';

export interface VisitWithPatient {
  id: string;
  plan_id: string;
  patient_id: string;
  org_id: string;
  nurse_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  visit_order: number | null;
  estimated_duration_min: number;
  status: string;
  checkin_at: string | null;
  checkin_location: string | null;
  checkout_at: string | null;
  checkout_location: string | null;
  actual_duration_min: number | null;
  patient: {
    id: string;
    full_name: string;
    address: string;
    address_detail: string | null;
    care_grade: string | null;
    mobility: string | null;
    primary_diagnosis: string | null;
    special_notes: string | null;
    phone: string | null;
  } | null;
  visit_record: {
    id: string;
    vitals: Record<string, number | undefined>;
    performed_items: { item: string; done: boolean; note?: string }[];
    nurse_note: string | null;
  }[] | null;
}

export interface VisitFormData {
  vitals: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate?: number;
    temperature?: number;
    blood_sugar?: number;
    spo2?: number;
    weight?: number;
  };
  performedItems: { item: string; done: boolean; note?: string }[];
  generalCondition: string | null;
  consciousness: string | null;
  skinCondition: string | null;
  nutritionIntake: string | null;
  painScore: number | null;
  nurseNote: string;
  messageToGuardian: string;
  photos: string[];
  voiceMemoUri: string | null;
}

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
  generalCondition: null,
  consciousness: null,
  skinCondition: null,
  nutritionIntake: null,
  painScore: null,
  nurseNote: '',
  messageToGuardian: '',
  photos: [],
  voiceMemoUri: null,
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
