import { supabase } from './supabase';
import {
  getOfflineRecords,
  removeOfflineRecord,
  clearOfflinePhotos,
  type OfflineVisitRecord,
} from './offline-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

/**
 * 단일 오프라인 기록을 Supabase에 동기화합니다.
 */
async function syncSingleRecord(record: OfflineVisitRecord): Promise<boolean> {
  try {
    // 1. 사진 업로드
    const uploadedPhotoUrls: string[] = [];
    for (const photoUri of record.data.photos) {
      if (photoUri.startsWith('file://') || photoUri.startsWith('/')) {
        const fileName = `visit-photos/${record.visitId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          const base64 = await FileSystem.readAsStringAsync(photoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('visit-photos')
            .upload(fileName, decode(base64), {
              contentType: 'image/jpeg',
            });
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('visit-photos')
              .getPublicUrl(uploadData.path);
            uploadedPhotoUrls.push(urlData.publicUrl);
          }
        }
      } else {
        uploadedPhotoUrls.push(photoUri);
      }
    }

    // 2. 음성 메모 업로드
    let voiceMemoUrl: string | null = null;
    if (record.data.voiceMemoUri) {
      const voiceUri = record.data.voiceMemoUri;
      const voiceFileName = `voice-memos/${record.visitId}/${Date.now()}.m4a`;
      const voiceInfo = await FileSystem.getInfoAsync(voiceUri);
      if (voiceInfo.exists) {
        const base64 = await FileSystem.readAsStringAsync(voiceUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('voice-memos')
          .upload(voiceFileName, decode(base64), {
            contentType: 'audio/m4a',
          });
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('voice-memos')
            .getPublicUrl(uploadData.path);
          voiceMemoUrl = urlData.publicUrl;
        }
      }
    }

    // 3. 방문 상태 업데이트 (체크인/체크아웃)
    if (record.checkinAt) {
      await supabase
        .from('visits')
        .update({
          status: 'checked_out',
          checkin_at: record.checkinAt,
          checkin_location: record.checkinLocation,
          checkout_at: record.checkoutAt,
          checkout_location: record.checkoutLocation,
          actual_duration_min: record.checkinAt && record.checkoutAt
            ? Math.round(
                (new Date(record.checkoutAt).getTime() - new Date(record.checkinAt).getTime()) /
                  60000,
              )
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.visitId);
    }

    // 4. 방문 기록 생성
    const { error: recordError } = await supabase.from('visit_records').insert({
      visit_id: record.visitId,
      nurse_id: record.nurseId,
      patient_id: record.patientId,
      vitals: {
        systolic_bp: record.data.vitals.systolic_bp,
        diastolic_bp: record.data.vitals.diastolic_bp,
        heart_rate: record.data.vitals.heart_rate,
        temperature: record.data.vitals.temperature,
        blood_sugar: record.data.vitals.blood_sugar,
        spo2: record.data.vitals.spo2,
        weight: record.data.vitals.weight,
      },
      performed_items: record.data.performedItems,
      general_condition: record.data.generalCondition,
      consciousness: record.data.consciousness,
      skin_condition: record.data.skinCondition,
      nutrition_intake: record.data.nutritionIntake,
      pain_score: record.data.painScore,
      nurse_note: record.data.nurseNote,
      voice_memo_url: voiceMemoUrl,
      photos: uploadedPhotoUrls,
      message_to_guardian: record.data.messageToGuardian,
      recorded_offline: true,
      synced_at: new Date().toISOString(),
    });

    if (recordError) {
      console.error('방문 기록 동기화 실패:', recordError);
      return false;
    }

    // 5. 방문 상태를 completed로 업데이트
    await supabase
      .from('visits')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', record.visitId);

    return true;
  } catch (error) {
    console.error('동기화 중 오류 발생:', error);
    return false;
  }
}

/**
 * 대기 중인 모든 오프라인 기록을 동기화합니다.
 */
export async function syncPendingRecords(
  onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; failed: number }> {
  const records = getOfflineRecords().filter((r) => !r.synced);
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    const success = await syncSingleRecord(record);
    if (success) {
      removeOfflineRecord(record.id);
      clearOfflinePhotos(record.visitId);
      synced++;
    } else {
      failed++;
    }
    onProgress?.(synced, records.length);
  }

  return { synced, failed };
}

/**
 * 네트워크 상태를 확인하고 온라인이면 동기화를 실행합니다.
 */
export async function checkNetworkAndSync(
  onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; failed: number } | null> {
  try {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable) {
      return await syncPendingRecords(onProgress);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Base64 문자열을 Uint8Array로 디코딩합니다.
 */
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bufferLength = base64.length * 0.75;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return bytes;
}
