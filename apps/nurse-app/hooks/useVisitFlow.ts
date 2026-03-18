import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useVisitStore, type VisitFormData } from '@/stores/visit-store';
import { useOfflineStore } from '@/stores/offline-store';
import {
  saveOfflineRecord,
  type OfflineVisitRecord,
} from '@/lib/offline-storage';
import { getToday } from '@homecare/shared-utils';

export function useVisitFlow(visitId: string) {
  const staffInfo = useAuthStore((s) => s.staffInfo);
  const userId = useAuthStore((s) => s.session?.user?.id);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queryClient = useQueryClient();

  const todayVisits = useVisitStore((s) => s.todayVisits);
  const updateFormData = useVisitStore((s) => s.updateFormData);
  const getFormData = useVisitStore((s) => s.getFormData);
  const clearFormData = useVisitStore((s) => s.clearFormData);

  const visit = useMemo(
    () => todayVisits.find((v) => v.id === visitId),
    [todayVisits, visitId],
  );

  const formData = getFormData(visitId);

  const checkin = useCallback(
    async (latitude: number, longitude: number, reason?: string) => {
      const locationStr = `POINT(${longitude} ${latitude})`;
      const now = new Date().toISOString();

      if (isOnline) {
        try {
          await supabase
            .from('visits')
            .update({
              status: 'checked_in',
              checkin_at: now,
              checkin_location: locationStr,
              updated_at: now,
            })
            .eq('id', visitId);

          queryClient.invalidateQueries({
            queryKey: ['todayVisits', staffInfo?.id, getToday()],
          });
        } catch (error) {
          console.error('체크인 실패:', error);
          Alert.alert('오류', '체크인에 실패했습니다. 다시 시도해주세요.');
          return false;
        }
      }

      updateFormData(visitId, {});
      return true;
    },
    [visitId, isOnline, staffInfo?.id, queryClient, updateFormData],
  );

  const saveVitals = useCallback(
    (vitals: VisitFormData['vitals']) => {
      updateFormData(visitId, { vitals });
    },
    [visitId, updateFormData],
  );

  const saveChecklist = useCallback(
    (items: VisitFormData['performedItems']) => {
      updateFormData(visitId, { performedItems: items });
    },
    [visitId, updateFormData],
  );

  const saveMemo = useCallback(
    (data: Partial<VisitFormData>) => {
      updateFormData(visitId, data);
    },
    [visitId, updateFormData],
  );

  const checkout = useCallback(
    async (latitude: number, longitude: number) => {
      const locationStr = `POINT(${longitude} ${latitude})`;
      const now = new Date().toISOString();
      const currentForm = getFormData(visitId);

      if (isOnline) {
        try {
          // 1. 방문 상태 업데이트
          await supabase
            .from('visits')
            .update({
              status: 'checked_out',
              checkout_at: now,
              checkout_location: locationStr,
              actual_duration_min: visit?.checkin_at
                ? Math.round(
                    (new Date(now).getTime() -
                      new Date(visit.checkin_at).getTime()) /
                      60000,
                  )
                : null,
              updated_at: now,
            })
            .eq('id', visitId);

          // 2. 방문 기록 생성
          await supabase.from('visit_records').insert({
            visit_id: visitId,
            nurse_id: staffInfo?.id ?? '',
            patient_id: visit?.patient_id ?? '',
            vitals: currentForm.vitals,
            performed_items: currentForm.performedItems,
            general_condition: currentForm.generalCondition,
            consciousness: currentForm.consciousness,
            skin_condition: currentForm.skinCondition,
            nutrition_intake: currentForm.nutritionIntake,
            pain_score: currentForm.painScore,
            nurse_note: currentForm.nurseNote || null,
            voice_memo_url: currentForm.voiceMemoUri,
            photos: currentForm.photos,
            message_to_guardian: currentForm.messageToGuardian || null,
            recorded_offline: false,
          });

          // 3. 완료 상태로 변경
          await supabase
            .from('visits')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', visitId);

          queryClient.invalidateQueries({
            queryKey: ['todayVisits', staffInfo?.id, getToday()],
          });

          clearFormData(visitId);
          return true;
        } catch (error) {
          console.error('체크아웃 실패:', error);
          Alert.alert('오류', '체크아웃에 실패했습니다. 오프라인 저장합니다.');
        }
      }

      // 오프라인 저장
      const offlineRecord: OfflineVisitRecord = {
        id: `offline-${visitId}-${Date.now()}`,
        visitId,
        nurseId: staffInfo?.id ?? '',
        patientId: visit?.patient_id ?? '',
        data: {
          vitals: currentForm.vitals,
          performedItems: currentForm.performedItems,
          generalCondition: currentForm.generalCondition,
          consciousness: currentForm.consciousness,
          skinCondition: currentForm.skinCondition,
          nutritionIntake: currentForm.nutritionIntake,
          painScore: currentForm.painScore,
          nurseNote: currentForm.nurseNote,
          messageToGuardian: currentForm.messageToGuardian,
          photos: currentForm.photos,
          voiceMemoUri: currentForm.voiceMemoUri,
        },
        checkinAt: visit?.checkin_at ?? null,
        checkinLocation: visit?.checkin_location ?? null,
        checkoutAt: now,
        checkoutLocation: locationStr,
        createdAt: now,
        synced: false,
      };

      saveOfflineRecord(offlineRecord);
      clearFormData(visitId);
      return true;
    },
    [
      visitId,
      visit,
      staffInfo?.id,
      isOnline,
      getFormData,
      clearFormData,
      queryClient,
    ],
  );

  return {
    visit,
    formData,
    checkin,
    saveVitals,
    saveChecklist,
    saveMemo,
    checkout,
    updateFormData: (partial: Partial<VisitFormData>) =>
      updateFormData(visitId, partial),
  };
}
